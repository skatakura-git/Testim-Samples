/**
 * Table - Extract / Validate / Click / GetRowNum (HTML table only)
 * - sourceColumn で searchValue に合致する行を見つけて targetColumn を処理
 * - もしくは rowIndex（行番号）を直接指定して targetColumn を処理
 *
 * Actions (param: action)
 *   "get"         : 値を取得（exportsTest[returnVariableName]）
 *   "validate"    : 期待値比較（不一致なら throw）※期待値未指定なら取得できた時点で成功
 *   "click"       : セル or セル内要素をクリック（clickQuery があればその要素）
 *   "getRowIndex" : 行番号だけ返す（exportsTest[rowIndexVariableName]）
 *
 * 主要パラメータ（Testim の Parameters として渡す）
 *   element              : (必須) PARAMS HTMLでDOMを選択することで指定可能
 *   action               : (任意) "get"(default) | "validate" | "click" | "getRowIndex"
 *
 * 行の特定（どちらかの方式）
 *   1) 明示指定: rowIndex（行番号）
 *      rowIndex         : (任意) 行番号
 *      rowIndexBase     : (任意) 0 or 1（既定 1）- 行の始まり位置を指定できます。
 *   2) 検索指定: sourceColumn + searchValue (+ matchType)
 *      sourceColumn     : (任意) 列名 / data-col / 0始まり列番号 or その文字列
 *      searchValue      : (任意) 検索文字列（regex の場合はパターン）
 *      matchType        : (任意) "exact"|"includes"|"startswith"|"endswith"|"regex"（既定 "exact"）
 *      caseInsensitive  : (任意) true/false（regex 含む、既定 true）
 *      occurrence/occurence : (任意) 何件目を取るか（1始まり、既定 1） ※両綴り対応
 *
 * 列の指定
 *   targetColumn        : (action≠getRowIndex で必須) 列名 / data-col / 列番号
 *   columnIndexBase     : (任意) 0(既定) or 1（targetColumn を数値で渡すときの基準）
 *
 * 返却・クリック・検証系オプション
 *   returnMode          : (任意) "text"(default) | "html" | "href"
 *   returnVariableName  : (任意) 返却変数名（既定 "cellValue"）
 *   expectedValue       : (任意) 期待値（validate 用）
 *   expectedMatchType   : (任意) 期待値比較の方法（既定は matchType と同じ）
 *   clickQuery          : (任意) セル内クリック対象 CSS セレクタ（例: "a", "button"）
 *   doubleClick         : (任意) true で dblclick（既定 false）
 *   scrollIntoView      : (任意) true でスクロール可視化（既定 true）
 *   rowIndexVariableName: (任意) 行番号の返却変数（既定 "rowIndex"）
 * 
 * 利用例
 *  |Account Name    Account Site    Billing State/Province  Phone   Type    Account Owner Alias |
 *  |--------------------------------------------------------------------------------------------|
 *  |ABC INC        |               |California             |11111  |Direct |jdoe                |
 *  |EFG INC        |               |Kanzas                 |22222  |Direct |Shun                |
 *  |HIJ INC        |               |Oregon                 |33333  |Direct |kata                |
 * 
 * 
 * #1 ABC INCのCellをクリック（clickQeryにaを指定することで、cell内のリンクをクリック)
 * "targetColumn" : "1"
 * "rowIndex" : "0"
 * "action" * "click"
 * 
 * #2 Phone列に22222が登録されている行を選択し、行内のAccount Name列を取得
 * "sourceColumn" : "Phone"
 * "searchValue" : "22222"
 * "targetColumn" : "Account Name"
 * "action" * "get"
 */

 /* globals element, sourceColumn, targetColumn, searchValue,
            action, matchType, caseInsensitive, occurrence, occurence,
            returnMode, returnVariableName,
            expectedValue, expectedMatchType,
            clickQuery, doubleClick, scrollIntoView,
            rowIndex, rowIndexBase, rowIndexVariableName,
            columnIndexBase */

  // -------------------- Defaults --------------------
  function norm(s){return (s==null?"":String(s)).trim().toLowerCase();}
  function slug(s){return norm(s).replace(/[\W_]+/g,"");}

  var _action = (typeof action==="string"?action.toLowerCase():"get"); // get|validate|click|getRowIndex
  var _mt     = (typeof matchType==="string"?matchType:"exact").toLowerCase();
  var _ci     = (typeof caseInsensitive==="boolean")?caseInsensitive:true;

  // occurrence / occurence 未指定でも安全
  var _occRaw = (typeof occurrence!=="undefined") ? occurrence
              : (typeof occurence!=="undefined")  ? occurence
              : 1;
  var _occ    = (Number(_occRaw)>0)?Number(_occRaw):1;

  var _mode   = (typeof returnMode==="string"?returnMode.toLowerCase():"text"); // text|html|href
  var _retVar = (typeof returnVariableName==="string"&&returnVariableName)?returnVariableName:"cellValue";

  var _expVal = (typeof expectedValue!=="undefined")?expectedValue:undefined;
  var _emt    = (typeof expectedMatchType==="string"?expectedMatchType:_mt).toLowerCase();

  var _clickQ = (typeof clickQuery==="string"&&clickQuery)?clickQuery:null;
  var _dbl    = (typeof doubleClick==="boolean")?doubleClick:false;
  var _siv    = (typeof scrollIntoView==="boolean")?scrollIntoView:true;

  // rowIndex 指定モード
  var _rowIndexRaw = (typeof rowIndex!=="undefined") ? rowIndex : null;

  // rowIndexBase 未指定でも安全（既定 1 = 1始まり）
  var _ribaseRaw = (typeof rowIndexBase!=="undefined") ? rowIndexBase : 1;
  var _ribase    = (Number(_ribaseRaw)===0)?0:1;

  // columnIndexBase: targetColumn を数値で渡すときに 0/1 始まりを選択（既定 0）
  var _colBaseRaw = (typeof columnIndexBase!=="undefined") ? columnIndexBase : 0;
  var _colBase    = (Number(_colBaseRaw)===1)?1:0;

  // -------------------- Guards ----------------------
  if(!element || !element.ownerDocument){
    throw new Error("element must be a real DOM element (not a string). Select the <table> (or a descendant) in the UI.");
  }
  var table = element.closest("table") || (element.querySelector && element.querySelector("table")) || element;
  if(!table || String(table.tagName).toLowerCase()!=="table"){
    throw new Error("Target element must be (or contain) a <table>.");
  }

  // targetColumn は getRowIndex 以外で必須
  if(_action!=="getRowIndex" && typeof targetColumn==="undefined"){
    throw new Error("targetColumn is required for action="+_action);
  }

  // 行の特定は 2 方式：rowIndex を渡すか、sourceColumn+searchValue で検索
  var usingExplicitRow = (_rowIndexRaw !== null && typeof _rowIndexRaw !== "undefined");
  if(!usingExplicitRow){
    if(typeof sourceColumn==="undefined")
      throw new Error("sourceColumn is required when rowIndex is not provided.");
    if(typeof searchValue==="undefined")
      throw new Error("searchValue is required to locate the row when rowIndex is not provided.");
  }

  // -------------------- Helpers ---------------------
  // 数値/数値文字列を 0 始まり index に直す（columnIndexBase を考慮）
  function asNumberIndex(sel){
    if(typeof sel==="number" && Number.isFinite(sel)) return Math.max(0, sel - _colBase);
    if(typeof sel==="string" && /^\d+$/.test(sel.trim())) return Math.max(0, parseInt(sel,10) - _colBase);
    return null;
  }

  // 列指定を index に解決（ラベル/データキー/インデックス対応）
  function resolveColIndex(table, colSel){
    var num = asNumberIndex(colSel);
    if(num!=null) return num;

    var map = {};
    var ths = table.querySelectorAll("thead th");
    if(ths && ths.length){
      Array.from(ths).forEach(function(th,i){
        var dataKey = th.getAttribute("data-col");
        var label   = (th.textContent||"").replace(/\s+/g," ").trim();
        [dataKey, norm(dataKey), slug(dataKey),
         label,   norm(label),   slug(label),
         String(i)]
        .filter(Boolean)
        .forEach(function(k){
          map[norm(k)] = i;
          map[slug(k)] = i;
        });
      });
    }else{
      // thead が無い場合、tbody 先頭行の td[data-col] から推定
      var firstRow = table.querySelector("tbody tr");
      if(firstRow){
        var tds = firstRow.querySelectorAll("td");
        Array.from(tds).forEach(function(td,i){
          var dataKey = td.getAttribute("data-col") || String(i);
          [dataKey, norm(dataKey), slug(dataKey), String(i)]
            .forEach(function(k){ map[norm(k)]=i; map[slug(k)]=i; });
        });
      }
    }

    var cand=[colSel, norm(colSel), slug(colSel)].map(norm);
    for(var j=0;j<cand.length;j++){ var k=cand[j]; if(k in map) return map[k]; }
    return null;
  }

  function cellText(td){
    if(!td) return "";
    return (td.innerText||td.textContent||"").replace(/\s+/g," ").trim();
  }

  function match(hayRaw, needleRaw, mt){
    if(mt==="regex"){
      try{
        var flags = _ci?"i":"";
        return new RegExp(needleRaw, flags).test(hayRaw);
      }catch(e){ return false; }
    }
    var hay = _ci?norm(hayRaw):String(hayRaw);
    var needle = _ci?norm(needleRaw):String(needleRaw);
    if(mt==="includes")   return hay.indexOf(needle)!==-1;
    if(mt==="startswith") return hay.startsWith(needle);
    if(mt==="endswith")   return hay.endsWith(needle);
    return hay===needle; // exact
  }

  function valueFromCell(td){
    if(!td) return "";
    if(_mode==="html") return td.innerHTML;
    if(_mode==="href"){
      var a = td.querySelector("a[href]");
      if(a && a.getAttribute("href")) return a.getAttribute("href");
    }
    return cellText(td);
  }

  // ---------------- Rows ---------------------------
  var rows = table.querySelectorAll("tbody tr");
  if(!rows || rows.length===0){
    // thead 以外の tr を対象
    rows = Array.from(table.querySelectorAll("tr")).filter(function(tr){ return tr.closest("thead")==null; });
  }

  // ---------------- Find target row ----------------
  var foundRow=null, foundRowIdx=-1;

  if(usingExplicitRow){
    // インデックス指定モード
    var idxRaw = Number(_rowIndexRaw);
    if(!Number.isFinite(idxRaw)) throw new Error("rowIndex must be a number.");
    var idx = (_ribase===0) ? idxRaw : (idxRaw - 1); // 0/1 始まり対応
    if(idx<0 || idx>=rows.length){
      throw new Error("rowIndex out of range: "+idxRaw+" (rows="+rows.length+", base="+_ribase+")");
    }
    foundRow = rows[idx];
    foundRowIdx = idx;
  }else{
    // 検索モード
    var srcIdx = resolveColIndex(table, sourceColumn);
    if(srcIdx==null) throw new Error("sourceColumn could not be resolved: "+JSON.stringify(sourceColumn));

    var wanted=_occ;
    Array.from(rows).some(function(tr,i){
      var tds = tr.children;
      if(!tds || tds.length<=srcIdx) return false;
      var txt = cellText(tds[srcIdx]);
      if(match(txt, searchValue, _mt)){
        wanted -= 1;
        if(wanted===0){ foundRow=tr; foundRowIdx=i; return true; }
      }
      return false;
    });

    if(!foundRow){
      throw new Error("No row matched: "+JSON.stringify({
        sourceColumn: sourceColumn, searchValue: searchValue, matchType: _mt, occurrence: _occ
      }));
    }
  }

  // 行番号返却（表示向けには 1 始まりが一般的）
  var oneBasedIndex = foundRowIdx + 1;

  if(_action==="getRowIndex"){
    var idxToReturn = (_ribase===0) ? foundRowIdx : oneBasedIndex;
    exportsTest[(typeof rowIndexVariableName==="string"&&rowIndexVariableName)?rowIndexVariableName:"rowIndex"] = idxToReturn;
    return;
  }

  // target cell
  var tgtIdx = resolveColIndex(table, targetColumn);
  if(tgtIdx==null) throw new Error("targetColumn could not be resolved: "+JSON.stringify(targetColumn));
  var tds = foundRow.children;
  if(!tds || tds.length<=tgtIdx){
    throw new Error("Target column index out of range: "+tgtIdx);
  }
  var targetTd = tds[tgtIdx];

  // ビューにスクロール
  try{ if(_siv && targetTd && targetTd.scrollIntoView) targetTd.scrollIntoView({block:"center", inline:"nearest"}); }catch(e){}

  // ------------- Actions ---------------------------
  var _riVar = (typeof rowIndexVariableName==="string"&&rowIndexVariableName)?rowIndexVariableName:"rowIndex";

  if(_action==="click"){
    var clickable = targetTd;
    if(_clickQ){
      var inside = targetTd.querySelector(_clickQ);
      if(inside) clickable = inside;
    }
    if(!clickable || typeof clickable.click!=="function"){
      throw new Error("Click target not found/clickable. cellSelector="+JSON.stringify(_clickQ||"<cell>"));
    }
    if(_dbl && typeof clickable.dispatchEvent==="function"){
      clickable.dispatchEvent(new MouseEvent("dblclick",{bubbles:true,cancelable:true,view:targetTd.ownerDocument.defaultView}));
    }else{
      clickable.click();
    }
    exportsTest[_retVar] = valueFromCell(targetTd);
    exportsTest[_riVar]  = (_ribase===0)?foundRowIdx:oneBasedIndex;
    return;
  }

  var val = valueFromCell(targetTd);

  if(_action==="validate"){
    if(typeof _expVal==="undefined"){
      // 期待値なし → 取得できれば成功扱い
      exportsTest[_retVar] = val;
      exportsTest[_riVar]  = (_ribase===0)?foundRowIdx:oneBasedIndex;
      return;
    }
    var ok = match(val, _expVal, _emt);
    if(!ok){
      throw new Error("Validation failed: got="+JSON.stringify(val)+" expected("+_emt+")="+JSON.stringify(_expVal));
    }
    exportsTest[_retVar] = val;
    exportsTest[_riVar]  = (_ribase===0)?foundRowIdx:oneBasedIndex;
    return;
  }

  // action === "get"
  exportsTest[_retVar] = val;
  exportsTest[_riVar]  = (_ribase===0)?foundRowIdx:oneBasedIndex;

