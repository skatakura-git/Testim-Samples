// DB名を指定して開く（なければ新規作成）
const request = indexedDB.open("testDB", 1);

request.onupgradeneeded = function(event) {
  const db = event.target.result;

  // objectStore (テーブル相当) を作成
  if (!db.objectStoreNames.contains("misc")) {
    db.createObjectStore("misc");
  }
};

request.onsuccess = function(event) {
  const db = event.target.result;

  // 書き込みトランザクション開始
  const tx = db.transaction("misc", "readwrite");
  const store = tx.objectStore("misc");

  // データを追加（キー: accessToken, 値: "abc123"）
  store.put("abc123", "accessToken");

  tx.oncomplete = function() {
    console.log("保存完了");

    // 保存した値を読み出し
    const readTx = db.transaction("misc", "readonly");
    const readStore = readTx.objectStore("misc");
    const getReq = readStore.get("accessToken");

    getReq.onsuccess = function() {
      console.log("読み出した値:", getReq.result);
    };
  };
};
