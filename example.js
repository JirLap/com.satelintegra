async partitionRead() {
  if (!satelSocketConnectionAlive && !alarmIdentified) return;
  this.log(' * Reading partitions');
  for (let totalPartitionsCount = 1; totalPartitionsCount <= totalZoneOutputPartitions[2]; totalPartitionsCount++) {
    this.log(` * Reading partitionnumber : ${totalPartitionsCount}`);
    await new Promise((resolve, reject) => {
      const input = functions.createFrameArray(['EE', '00', `${functions.dec2hex2Digit(totalPartitionsCount)}`]);
      // send commands for readout partitions
      satelSocket.write(Buffer.from(input.join(''), 'hex'));
      satelSocket.once('data', data => {
        this.readingZonesOutputsPartitionsPayload(data);
        resolve(data);
      }).on('error', error => {
        reject(error);
      });
    });
    await delay(1000);
  }
}