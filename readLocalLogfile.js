//ローカルファイルのログをチェックします。ログ内にERRORが存在する場合は、コンソールログを出力し、Errorとしてステップを終了。
//logfile をPARAMSに設定
//CLI Actionとしてステップを登録してください。

const fs = require('fs');

async function run() {
  if (!logfile) throw new Error("Missing logfile param");

  // ローカルファイルを読み込み（改行コード \r\n / \n どちらでも対応）
  const text = await fs.promises.readFile(logfile, "utf-8");
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (line.includes("ERROR")) {
      console.log(line);  // ERROR を含む行を出力
      throw new Error("ログにエラーがありました。Step logを確認してください。");
    }
  }

  // エラーが1つもなければ成功扱い
  return true;
}

return run();
