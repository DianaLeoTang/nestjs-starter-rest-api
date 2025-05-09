/*
 * @Author: Diana Tang
 * @Date: 2025-05-10 01:01:44
 * @LastEditors: Diana Tang
 * @Description: some description
 * @FilePath: /nestjs-starter-rest-api/time.cjs
 */
const { spawn } = require('child_process');
const process = spawn('npm', ['run', 'test']);
const dataBegin = new Date();

process.stdout.on('data', (data) => {
  console.log(data.toString());
  if (data.toString().includes('created bundle.js')) {
    const dateEnd = new Date();
    console.log('Duration:', dateEnd - dataBegin, 'ms');
    process.kill();
  }
});
// 添加错误处理
process.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});
process.on('close', (code) => {
  const dateEnd = new Date();
  console.log('Duration:', dateEnd - dataBegin, 'ms');
  console.log(`child process exited with code ${code}`);
});
