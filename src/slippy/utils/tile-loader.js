// Listen for messages from the main thread
onmessage = function (e) {
    const tileUrl = e.data;
    const img = new Image();
    img.onload = function () {
      // Send the loaded image back to the main thread
      postMessage(img);
    };
    img.src = tileUrl;
  };