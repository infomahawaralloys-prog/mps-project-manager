// ============================================================
// Excel parsers for Fabrication uploads
// (BOM, Sheeting BOQ, Deck Sheet)
// Extracted verbatim from the original legacy FabTab.
// Wrapped as a factory so handlers capture project + auth.
// ============================================================
import * as db from './database';

export function createFabUploaders({ project, auth, onComplete, onError }) {
  function findCol(headers, keywords, excludeKw) {
    for (var i = 0; i < headers.length; i++) {
      var h = String(headers[i] || '').toLowerCase().replace(/\u00a0/g, ' ').trim();
      var found = false;
      for (var k = 0; k < keywords.length; k++) { if (h.indexOf(keywords[k]) >= 0) { found = true; break; } }
      if (found && excludeKw && excludeKw.length > 0) {
        for (var e = 0; e < excludeKw.length; e++) { if (h.indexOf(excludeKw[e]) >= 0) { found = false; break; } }
      }
      if (found) return headers[i];
    }
    return null;
  }

  function findHeaderRow(XLSX, ws) {
    var aoa = XLSX.utils.sheet_to_json(ws, {header:1});
    var markKw = ['mark', 'assembly', 'standard', 'item', 'part'];
    var qtyKw = ['qty', 'quantity', 'nos', 'pcs'];
    for (var i = 0; i < Math.min(25, aoa.length); i++) {
      var row = aoa[i];
      if (!row) continue;
      var rowStr = row.map(function(c){ return String(c || '').toLowerCase().replace(/\u00a0/g, ' '); });
      var hasMark = rowStr.some(function(c){ return markKw.some(function(k){ return c.indexOf(k) >= 0; }); });
      var hasQty = rowStr.some(function(c){ return qtyKw.some(function(k){ return c.indexOf(k) >= 0; }); });
      if (hasMark && hasQty) return i;
    }
    return 0;
  }

  function smartParseSheet(XLSX, ws) {
    var headerIdx = findHeaderRow(XLSX, ws);
    var rows = XLSX.utils.sheet_to_json(ws, { range: headerIdx, defval: '' });
    if (!rows || rows.length === 0) return [];
    var headers = Object.keys(rows[0]);
    var markCol = findCol(headers, ['mark', 'assembly', 'pos', 'part no', 'standard', 'item'], []);
    var descCol = findCol(headers, ['desc', 'type', 'name'], ['net', 'weight', 'qty']);
    var qtyCol = findCol(headers, ['qty', 'quantity', 'nos', 'pcs'], []);
    var wtCol = findCol(headers, ['weight', 'wt', 'kg'], ['all', 'total', 'for all', 'gross']);
    if (!wtCol) wtCol = findCol(headers, ['weight', 'wt', 'kg'], []);
    var areaCol = findCol(headers, ['area', 'sq'], []);
    var colorCol = findCol(headers, ['color', 'colour', 'shade'], []);
    if (!markCol) return [];
    var results = [];
    rows.forEach(function(r) {
      var mark = String(r[markCol] || '').replace(/\u00a0/g, '').trim();
      if (!mark) return;
      var ml = mark.toLowerCase();
      if (ml.indexOf('legend') >= 0 || ml.indexOf('total') >= 0 || ml.indexOf('grand') >= 0 || ml === 'sno' || ml === 'sr' || ml.indexOf('---') >= 0) return;
      var qty = qtyCol ? (parseInt(r[qtyCol]) || 0) : 1;
      if (qty <= 0) return;
      results.push({
        mark: mark,
        description: descCol ? String(r[descCol] || '').replace(/\u00a0/g, ' ').trim() : '',
        qty: qty,
        weight: wtCol ? (parseFloat(r[wtCol]) || 0) : 0,
        area: areaCol ? (parseFloat(r[areaCol]) || 0) : 0,
        color: colorCol ? String(r[colorCol] || '').trim() : ''
      });
    });
    return results;
  }

  async function handleBomUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var XLSX = await import('xlsx');
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type:'binary' });
        var newParts = [];
        var sheetName = wb.SheetNames.find(function(s){ var l = s.toLowerCase(); return l.indexOf('shipping') >= 0 || (l.indexOf('boq') >= 0 && l.indexOf('built') < 0); })
          || wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf('PEB') >= 0 && s.toUpperCase().indexOf('BUILT') >= 0; })
          || wb.SheetNames[0];
        if (sheetName) {
          smartParseSheet(XLSX, wb.Sheets[sheetName]).forEach(function(p) {
            var m = (p.mark || '').trim().toUpperCase();
            var d = (p.description || '').toUpperCase();
            var isColdform =
              /^PUR/.test(m) ||
              /^GT/.test(m) ||
              /^C_GT/.test(m) ||
              /^HD/.test(m) ||
              (/^JB/.test(m) && d.indexOf('JAMB') >= 0);
            newParts.push({
              project_id: project.id,
              category: isColdform ? 'coldform' : 'builtup',
              mark: p.mark,
              description: p.description,
              qty: p.qty,
              weight: p.weight
            });
          });
        }
        ['PURLIN','GIRT','JAMB','HEADER'].forEach(function(prefix) {
          var sn = wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf(prefix) >= 0; });
          if (sn) {
            smartParseSheet(XLSX, wb.Sheets[sn]).forEach(function(p) {
              newParts.push({ project_id: project.id, category:'coldform', mark: p.mark, description: p.description || prefix, qty: p.qty, weight: p.weight });
            });
          }
        });
        var hwSheet = wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf('HARDWARE') >= 0; });
        if (hwSheet) {
          smartParseSheet(XLSX, wb.Sheets[hwSheet]).forEach(function(p) {
            newParts.push({ project_id: project.id, category:'hardware', mark: p.mark, description: p.description, qty: p.qty, weight: p.weight });
          });
        }
        if (newParts.length === 0) { alert('No parts found in BOM. Make sure file has Mark/Assembly and Qty/Weight columns.'); return; }
        await db.deleteParts(project.id, 'builtup'); await db.deleteParts(project.id, 'coldform'); await db.deleteParts(project.id, 'hardware');
        await db.upsertParts(newParts);
        var counts = {}; newParts.forEach(function(p){ counts[p.category] = (counts[p.category]||0) + 1; });
        await db.logActivity({ project_id: project.id, action_type: 'parts_upload', details: 'Uploaded BOM: ' + Object.keys(counts).map(function(k){ return counts[k] + ' ' + k; }).join(', '), user_name: auth.userName, user_role: auth.role });
        loadData();
        alert('BOM uploaded: ' + newParts.length + ' parts');
      } catch (err) { alert('Error reading BOM: ' + err.message); }
    };
    reader.readAsBinaryString(file); e.target.value = '';
  }


  async function handleSheetingUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var unitWt = prompt('Enter unit weight of sheet material (kg/m\u00b2):\n\nCommon values:\n0.50mm Hi-Rib = 4.4\n0.60mm Hi-Rib = 5.3\n0.47mm Hi-Rib = 4.1', '4.4');
    if (!unitWt) return;
    unitWt = parseFloat(unitWt) || 4.4;
    var XLSX = await import('xlsx');
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type:'binary' });
        var newParts = [];
        var POLY_PREFIXES = ['WP','PC','SKY','LT'];

        // Dedicated sheeting parser: find Dwg. Ref. header in each sheet
        wb.SheetNames.forEach(function(sn) {
          var su = sn.toUpperCase();
          var defaultCat = null;
          if (su.indexOf('ROOF') >= 0) defaultCat = 'roofing';
          else if (su.indexOf('CLAD') >= 0 || su.indexOf('WALL') >= 0) defaultCat = 'cladding';
          else if (su.indexOf('FLASH') >= 0 || su.indexOf('TRIM') >= 0 || su.indexOf('ACCESS') >= 0) defaultCat = 'accessories';
          if (!defaultCat) return;

          var aoa = XLSX.utils.sheet_to_json(wb.Sheets[sn], {header:1});
          var headerIdx = -1;
          for (var i = 0; i < Math.min(25, aoa.length); i++) {
            if (!aoa[i]) continue;
            var found = aoa[i].some(function(c) {
              var s = String(c || '').toLowerCase();
              return s.indexOf('dwg') >= 0 && s.indexOf('ref') >= 0;
            });
            if (found) { headerIdx = i; break; }
          }
          if (headerIdx < 0) return;

          // Build rows from aoa directly — xlsx-js range/header indices can diverge
          // on sheets with blank leading rows (caused ROOF SHEET parse failure).
          var headerRow = aoa[headerIdx].map(function(h) { return String(h || '').trim(); });
          var rows = [];
          for (var ri = headerIdx + 1; ri < aoa.length; ri++) {
            if (!aoa[ri]) continue;
            var obj = {};
            var hasVal = false;
            for (var ci = 0; ci < headerRow.length; ci++) {
              var key = headerRow[ci] || ('__col_' + ci);
              var val = aoa[ri][ci];
              obj[key] = (val === undefined || val === null) ? '' : val;
              if (obj[key] !== '') hasVal = true;
            }
            if (hasVal) rows.push(obj);
          }
          if (!rows || rows.length === 0) return;
          var headers = headerRow.filter(function(h) { return h; });

          var markCol = findCol(headers, ['dwg', 'ref'], []);
          var descCol = findCol(headers, ['item', 'sketch'], ['weight','qty','nos']);
          var qtyCol = findCol(headers, ['nos'], []);
          var areaSqCol = null;
          for (var ai = 0; ai < headers.length; ai++) {
            var ahl = headers[ai].toLowerCase();
            if (ahl.indexOf('sq') >= 0 && ahl.indexOf('mtr') >= 0) { areaSqCol = headers[ai]; break; }
          }
          var lengthCol = null;
          for (var li = 0; li < headers.length; li++) {
            var lhl = headers[li].toLowerCase();
            if (lhl.indexOf('mtr') >= 0 && lhl.indexOf('sq') < 0) { lengthCol = headers[li]; break; }
          }
          var wtCol = findCol(headers, ['weight', 'wt'], []);
          var colorCol = findCol(headers, ['colour', 'color'], []);
          if (!colorCol) colorCol = findCol(headers, ['remark'], []);
          if (!markCol) return;

          rows.forEach(function(r) {
            var rawMark = String(r[markCol] || '').replace(/\u00a0/g, '').trim();
            if (!rawMark || rawMark === 'NaN' || rawMark.toLowerCase() === 'nan') return;
            if (/^\d+\.?\d*$/.test(rawMark.replace(/-/g, ''))) return;
            var ml = rawMark.toLowerCase();
            if (ml.indexOf('total') >= 0 || ml.indexOf('dwg') >= 0 || ml.indexOf('grand') >= 0) return;

            var qtyRaw = parseFloat(r[qtyCol]) || 0;
            var qty = qtyRaw > 0 ? Math.ceil(qtyRaw) : 0;
            if (qty <= 0) return;

            var areaSqm = areaSqCol ? (parseFloat(r[areaSqCol]) || 0) : 0;
            var lengthM = lengthCol ? (parseFloat(r[lengthCol]) || 0) : 0;

            var mu = rawMark.toUpperCase();
            var category = defaultCat;
            if (/^FT/.test(mu)) category = 'accessories';
            var isPoly = POLY_PREFIXES.some(function(px) { return mu.indexOf(px) === 0; });
            if (isPoly) category = 'accessories';

            var totalWeight = 0;
            if (wtCol) { var wv = parseFloat(r[wtCol]); if (wv > 0) totalWeight = wv; }
            if (totalWeight === 0 && areaSqm > 0 && (category === 'roofing' || category === 'cladding')) {
              totalWeight = areaSqm * unitWt;
            }
            var perPieceWt = qty > 0 ? Math.round(totalWeight / qty * 1000) / 1000 : 0;
            if (category === 'accessories') { perPieceWt = 0; }

            var areaField = 0;
            if (category === 'accessories') {
              areaField = isPoly ? areaSqm : lengthM;
            } else {
              areaField = areaSqm;
            }

            var color = '';
            if (colorCol) {
              var cv = String(r[colorCol] || '').trim().toUpperCase();
              if (cv && cv !== 'NAN' && !/^\d+\.?\d*$/.test(cv)) color = cv;
            }
            var desc = descCol ? String(r[descCol] || '').replace(/\u00a0/g, ' ').trim() : '';
            if (desc.toLowerCase() === 'nan') desc = '';

            newParts.push({ project_id: project.id, category: category, mark: rawMark, description: desc, qty: qty, weight: perPieceWt, area: Math.round(areaField * 100) / 100, color: color });
          });
        });

        // Deduplicate: suffix ALL duplicates with color
        var byCatMark = {};
        newParts.forEach(function(p) { var k = p.category + '::' + p.mark; if (!byCatMark[k]) byCatMark[k] = []; byCatMark[k].push(p); });
        Object.keys(byCatMark).forEach(function(k) { var g = byCatMark[k]; if (g.length <= 1) return; g.forEach(function(p) { if (p.color) p.mark = p.mark + '-' + p.color; }); });
        // Second pass: running number for remaining dups
        var byCatMark2 = {};
        newParts.forEach(function(p) { var k = p.category + '::' + p.mark; if (!byCatMark2[k]) byCatMark2[k] = []; byCatMark2[k].push(p); });
        Object.keys(byCatMark2).forEach(function(k) { var g = byCatMark2[k]; if (g.length <= 1) return; for (var di = 1; di < g.length; di++) { g[di].mark = g[di].mark + '-' + (di + 1); } });

        if (newParts.length === 0) { alert('No sheeting parts found. Make sure the file has Dwg. Ref. column.'); return; }
        await db.deleteParts(project.id, 'roofing'); await db.deleteParts(project.id, 'cladding'); await db.deleteParts(project.id, 'accessories');
        await db.upsertParts(newParts);
        var counts = {}; newParts.forEach(function(p) { counts[p.category] = (counts[p.category] || 0) + 1; });
        await db.logActivity({ project_id: project.id, action_type: 'parts_upload', details: 'Uploaded Sheeting BOQ: ' + Object.keys(counts).map(function(k) { return counts[k] + ' ' + k; }).join(', '), user_name: auth.userName, user_role: auth.role });
        loadData();
        alert('Sheeting BOQ uploaded: ' + newParts.length + ' parts (' + Object.keys(counts).map(function(k) { return counts[k] + ' ' + k; }).join(', ') + ')');
      } catch (err) { alert('Error reading Sheeting BOQ: ' + err.message); }
    };
    reader.readAsBinaryString(file); e.target.value = '';
  }

  async function handleDeckUpload(e) {
    var file = e.target.files[0]; if (!file) return;
    var XLSX = await import('xlsx');
    var reader = new FileReader();
    reader.onload = async function(ev) {
      try {
        var wb = XLSX.read(ev.target.result, { type:'binary' });
        var newParts = [];
        // Look for DECK sheet first, then try all sheets for DS* marks
        var deckSheet = wb.SheetNames.find(function(s){ return s.toUpperCase().indexOf('DECK') >= 0; });
        var sheetsToCheck = deckSheet ? [deckSheet] : wb.SheetNames;
        sheetsToCheck.forEach(function(sn) {
          var parsed = smartParseSheet(XLSX, wb.Sheets[sn]);
          parsed.forEach(function(p) {
            if (deckSheet || p.mark.toUpperCase().indexOf('DS') === 0) {
              newParts.push({ project_id: project.id, category:'deck', mark: p.mark, description: p.description || 'Deck Sheet', qty: p.qty, weight: p.weight, area: p.area });
            }
          });
        });
        if (newParts.length === 0) { alert('No deck parts found. Use a file with DECK sheet or DS* marks.'); return; }
        await db.deleteParts(project.id, 'deck');
        await db.upsertParts(newParts);
        await db.logActivity({ project_id: project.id, action_type: 'parts_upload', details: 'Uploaded Deck BOQ: ' + newParts.length + ' parts', user_name: auth.userName, user_role: auth.role });
        loadData();
        alert('Deck BOQ uploaded: ' + newParts.length + ' parts');
      } catch (err) { alert('Error reading Deck BOQ: ' + err.message); }
    };
    reader.readAsBinaryString(file); e.target.value = '';
  }


  // Wrap upload handlers so they refresh on success
  function _wrap(fn) {
    return async function(e) {
      try {
        await fn(e);
        if (onComplete) onComplete();
      } catch (err) {
        console.error(err);
        if (onError) onError(err);
        else alert(err.message || 'Upload failed');
      }
    };
  }

  return {
    handleBomUpload: _wrap(handleBomUpload),
    handleSheetingUpload: _wrap(handleSheetingUpload),
    handleDeckUpload: _wrap(handleDeckUpload),
  };
}
