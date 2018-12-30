/**
 * 解決問題： 上傳圖片旋轉90°；
 * 
 */
import exif from "exif-js";  // 獲取圖片方向
import watermark from 'watermarkjs'; // 添加水印
import { base64UrlToBlob, getImgSize, canvasDataURL, photoCompress , } from '@/utils/agImg';
// function base64UrlToBlob (urlData) { // 讲base64转化为blob对象进行上传
//   var arr = urlData.split(',')
//   var mime = arr[0].match(/:(.*?);/)[1]
//   var bstr = atob(arr[1])
//   var n = bstr.length
//   var u8arr = new Uint8Array(n)
//   while (n--) {
//     u8arr[n] = bstr.charCodeAt(n)
//   }
//   return new Blob([u8arr], { type: mime })
// }
var UA = (function (userAgent) {
    var ISOldIOS     = /OS (\d)_.* like Mac OS X/g.exec(userAgent),
        isOldAndroid = /Android (\d.*?);/g.exec(userAgent) || /Android\/(\d.*?) /g.exec(userAgent);

    // 判断设备是否是IOS7以下
    // 判断设备是否是android4.5以下
    // 判断是否iOS
    // 判断是否android
    // 判断是否QQ浏览器
    return {
        oldIOS    : ISOldIOS ? +ISOldIOS.pop() < 8 : false,
        oldAndroid: isOldAndroid ? +isOldAndroid.pop().substr(0, 3) < 4.5 : false,
        iOS       : /\(i[^;]+;( U;)? CPU.+Mac OS X/.test(userAgent),
        android   : /Android/g.test(userAgent),
        mQQBrowser: /MQQBrowser/g.test(userAgent)
    }
})(navigator.userAgent);

class localResize {
  img = new Image();
  canvas = document.createElement('canvas');
  ctx = null;
  blob  = null;
  watermarkBase = null;
  fileName = '';
  base64 = null; // 存儲base64
  resize = {
    height: null,
    width: null
  }
  orientation = null; // 方向
  constructor( file, opts = {
    width    : null,
    height   : null,
    quality  : 0.7,
    watermarkFile: 0.8, // 水印的圖片更加項目需求 默認是這樣圖
  }) {
    this.file = file;
    this.opts = opts;
    this.blob = URL.createObjectURL(file);
    // this.init();
  }
  init() {
    let that   = this;
    this.fileName = this.file.name;
    this.img.src = this.blob;
    console.log(this.blob);
    return new Promise((resolve, reject) =>{
      this.img.onload = function() {
        that._getBase64()
        .then((base64) => {
          if (base64.length < 10) {
              var err = new Error('生成base64失败');
              reject(err);
              throw err;
          }
          return that._watermark(base64);
          return base64;
        })
        .then(function(base64) {
            that.base64 = base64;
        //   let formData = new FormData();
        //   let bolb = base64UrlToBlob(base64);
        //   that.blob = bolb;
        //   formData.append("fileData", bolb, "file_"+Date.parse(new Date())+".jpg"); // 添加文件
        //   console.log(bolb)
              resolve({
                //   formData : formData,
                  base64  : base64,
                  resize: that.resize, // 圖片寬高
              });
        })
      }
    })

  }

  _watermark(bass) { // 圖片添加水印

    const that = this;
    const resize = that.resize;
    const img = that.img;
    const canvas = that.canvas; 
    const context=canvas.getContext("2d");
    
    img.src = bass;
    return new Promise((resolve, reject) => {
        img.onload = function() {
            var text = '僅限CMHK上臺使用，不保存在手機內';
        
            context.drawImage( img,0,0);
        
            var metrics = context.measureText(text); // 
            var x = (this.width / 5);
            var y = (this.height / 5);
        
            let testWidth = Math.sqrt(Math.pow(this.width, 2) + Math.pow(this.height, 2)); // 獲取第三邊的長度
        
            const angle = this.height/this.width * 45; // 正切獲取角度
        
            context.translate(x, y);
            context.globalAlpha = 0.5;
            context.fillStyle = 'red';
            context.font = `${testWidth/text.length * 0.6}px microsoft yahei`;
            context.rotate(angle * Math.PI / 180); // 旋轉
            context.fillText(text, 0, 0);
        
            let base64 = canvas.toDataURL('image/jpeg', 0.8);
            console.log('第一次',base64UrlToBlob(base64))
            resolve(base64)
        }
    })

    // that.img.onload =function () {
    //     context.drawImage(this, 0, 0);
    //     var base64 = canvas.toDataURL('image/png')
    //     console.log('二次壓縮',base64UrlToBlob(base64))

    // }
    // console.log(this);
    // var text = '僅限CMHK上臺使用，不保存在手機內';
    
    // context.drawImage( img,0,0);

    // var metrics = context.measureText(text); // 
    // var x = (this.width / 5);
    // var y = (this.height / 5);

    // let testWidth = Math.sqrt(Math.pow(this.width, 2) + Math.pow(this.height, 2)); // 獲取第三邊的長度

    // const angle = this.height/this.width * 45; // 正切獲取角度

    // context.translate(x, y);
    // context.globalAlpha = 0.5;
    // context.fillStyle = '#000';
    // context.font = `${testWidth/text.length * 0.6}px microsoft yahei`;
    // context.rotate(angle * Math.PI / 180); // 旋轉
    // context.fillText(text, 0, 0);

    // let base64 = canvas.toDataURL('image/jpeg', 0.8);

    // console.log('第一次',base64UrlToBlob(base64))

  }
  _getBase64() {
    let that   = this,
    img    = that.img,
    file   = that.file,
    canvas = that.canvas;

    return new Promise(function (resolve) {
        try {
            // 传入blob在android4.3以下有bug
            exif.getData(typeof file === 'object' ? file : img, function () {
                that.orientation = exif.getTag(file, "Orientation");
                console.log('orientation', that.orientation );
                that.resize = that._getResize();
                that.ctx    = canvas.getContext('2d');

                canvas.width  = that.resize.width;
                canvas.height = that.resize.height;

                // 设置为白色背景，jpg是不支持透明的，所以会被默认为canvas默认的黑色背景。
                that.ctx.fillStyle = '#fff';
                that.ctx.fillRect(0, 0, canvas.width, canvas.height);

                // 根据设备对应处理方式
                if (UA.oldIOS) {
                    that._createBase64ForOldIOS().then(resolve);
                }
                else {
                    that._createBase64().then(resolve);
                }
            });
        } catch (err) {
            // 这样能解决低内存设备闪退的问题吗？
            throw new Error(err);
        }
    });
  }

  _createBase64ForOldIOS() {
    var that        = this,
        img         = that.img,
        canvas      = that.canvas,
        defaults    = that.defaults,
        orientation = that.orientation;

    return new Promise(function (resolve) {
        require(['./megapix-image'], function (MegaPixImage) {
            var mpImg = new MegaPixImage(img);

            if ("5678".indexOf(orientation) > -1) {
                mpImg.render(canvas, {
                    width      : canvas.height,
                    height     : canvas.width,
                    orientation: orientation
                });
            } else {
                mpImg.render(canvas, {
                    width      : canvas.width,
                    height     : canvas.height,
                    orientation: orientation
                });
            }

            resolve(canvas.toDataURL('image/jpeg', defaults.quality));
        });
    });
  }
  _getResize() {
    var that        = this,
        img         = that.img,
        defaults    = that.opts,
        width       = defaults.width,
        height      = defaults.height,
        orientation = that.orientation;

    var ret = {
        width : img.width,
        height: img.height
    };

    if ("5678".indexOf(orientation) > -1) {
        ret.width  = img.height;
        ret.height = img.width;
    }

    // 如果原图小于设定，采用原图
    if (ret.width < width || ret.height < height) {
        return ret;
    }

    var scale = ret.width / ret.height;

    if (width && height) {
        if (scale >= width / height) {
            if (ret.width > width) {
                ret.width  = width;
                ret.height = Math.ceil(width / scale);
            }
        } else {
            if (ret.height > height) {
                ret.height = height;
                ret.width  = Math.ceil(height * scale);
            }
        }
    }
    else if (width) {
        if (width < ret.width) {
            ret.width  = width;
            ret.height = Math.ceil(width / scale);
        }
    }
    else if (height) {
        if (height < ret.height) {
            ret.width  = Math.ceil(height * scale);
            ret.height = height;
        }
    }

    // 超过这个值base64无法生成，在IOS上
    while (ret.width >= 3264 || ret.height >= 2448) {
        ret.width *= 0.8;
        ret.height *= 0.8;
    }

    return ret;
  }
// --------------------------------------------------------------------------------
 _createBase64() {
    var that        = this,
        resize      = that.resize,
        img         = that.img,
        canvas      = that.canvas,
        ctx         = that.ctx,
        defaults    = that.opts,
        orientation = that.orientation;

    // 调整为正确方向
    switch (orientation) {
        case 3:
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -resize.width, -resize.height, resize.width, resize.height);
            break;
        case 6:
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, 0, -resize.width, resize.height, resize.width);
            break;
        case 8:
            ctx.rotate(270 * Math.PI / 180);
            ctx.drawImage(img, -resize.height, 0, resize.height, resize.width);
            break;

        case 2:
            ctx.translate(resize.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, resize.width, resize.height);
            break;
        case 4:
            ctx.translate(resize.width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(180 * Math.PI / 180);
            ctx.drawImage(img, -resize.width, -resize.height, resize.width, resize.height);
            break;
        case 5:
            ctx.translate(resize.width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(90 * Math.PI / 180);
            ctx.drawImage(img, 0, -resize.width, resize.height, resize.width);
            break;
        case 7:
            ctx.translate(resize.width, 0);
            ctx.scale(-1, 1);
            ctx.rotate(270 * Math.PI / 180);
            ctx.drawImage(img, -resize.height, 0, resize.height, resize.width);
            break;

        default:
            ctx.drawImage(img, 0, 0, resize.width, resize.height);
    }

    return new Promise(function (resolve) {
        // if (UA.oldAndroid || UA.mQQBrowser || !navigator.userAgent) {
        //     require(['jpeg_encoder_basic'], function (JPEGEncoder) {
        //         var encoder = new JPEGEncoder(),
        //             img     = ctx.getImageData(0, 0, canvas.width, canvas.height);

        //         resolve(encoder.encode(img, defaults.quality * 100));
        //     })
        // }
        // else {
            resolve(canvas.toDataURL('image/jpeg', defaults.quality));
        // }
    });
 }

}
export default localResize;