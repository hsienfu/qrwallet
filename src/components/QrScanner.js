import React, { useEffect, useRef, useState } from "react";
import QrScanner from 'qr-scanner';
import QRCode from 'qrcode';
import Store from 'electron-store';
import model from '../model';
import utils from '../utils';

// HTTP通讯密钥
const SECRET_KEY  = 'Fs8WxVsF1HxvbXKpzVSEYCFcTV';
const DELIMITER   = '^';

// 扫码结果
const scan_result = [];

// 二维码指令
const task_qrcode = [];

// 通知业务系统
const task_notify = [];

// 配置信息
const store = new Store({
  defaults: {
    host:     'http://localhost:7004/JgmNVZrNaLrD9aKgT3j8',
    proxy:    true,
    duration: 1000,
    scale:    5,
  },
});

function format_command(result) {
  const [ sign, ...params ] = result.split(DELIMITER);

  if (sign === utils.hmac({ data: params.join(DELIMITER) }, SECRET_KEY)) {
    return params;
  }

  console.log('[WARN] Http signature error!');
  return [];
}

function format_response(action, message) {
  let data = action + DELIMITER + message;
  let sign = utils.hmac({ data }, SECRET_KEY);
  return sign + DELIMITER + data;
}

export default () => {
  const videoEl = useRef(null);

  const [ menu, toggleMenu ] = useState(false);
  const [ debug, setDebug ] = useState(false);
  const [ x, setX ] = useState(0);
  const [ y, setY ] = useState(0);
  const [ z, setZ ] = useState(0);

  const [ duration, setDuration ] = useState(store.get('duration'));
  const [ scale, setScale ] = useState(store.get('scale'));
  const [ url, setUrl ] = useState(null);

  const [ host, setHost ] = useState(store.get('host'));
  const [ proxy, setProxy ] = useState(store.get('proxy'));

  const [ offline, setOfflineStatus ] = useState(
    navigator.onLine === false && store.get('proxy') === false
  );

  const handleSetProxy = () => {
    if (navigator.onLine === false) {
      setProxy(false);
      store.set('proxy', false);
      setOfflineStatus(true);
    }
  };

  const handleSetHost = (value) => {
    setHost(value);
    store.set('host', value);
  };

  const handleSetDuration = (value) => {
    setDuration(value);
    store.set('duration', value);
  };

  const handleSetScale = (value) => {
    setScale(value);
    store.set('scale', value);
  };

  useEffect(() => {
    const updateOnlineStatus = () => {
      setOfflineStatus(
        navigator.onLine === false && store.get('proxy') === false
      );
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  /// XXX: 数据库
  useEffect(() => {
    // sync() will create all table if they doesn't exist in database
    model.sequelize.sync({ force: false }).then(async () => {
      console.log('[INFO] Sqlite3 database is ok!');
    });
  }, []);

  /// XXX: 扫码
  useEffect(() => {
    const callback = async ({ data, cornerPoints }) => {
      if (data) {
        scan_result.push(data);
      }
    };

    const scanner = new QrScanner(videoEl.current, callback, {
      onDecodeError: err => {
        if (err === 'Scanner error: No QR code found') {
          // ignore
        } else {
          console.log(err);
        }
      },
      highlightScanRegion: true,
      highlightCodeOutline: true,
      returnDetailedScanResult: true,
    });

    scanner.start().then(() => console.log('[INFO] Scanner start...'));

    return () => {
      scanner.stop();
    };
  }, []);

  /// XXX: 处理扫码结果
  useEffect(() => {
    let timer = null;

    // 跳过一些重复的扫描结果
    let latest_result;
    let i = 0;

    const run = async () => {
      let result = scan_result.pop();
      setX(scan_result.length);

      if (result) {
        if (result !== latest_result || (++i % 5) === 0) {
          if (result !== latest_result) i = 0;
          latest_result = result;

          // 开始业务处理
          let [ action, ...params ] = format_command(result);

          // 物理网络隔离才是签名机
          if (offline) {

            // 请求生成托管钱包
            if (action === 'ping.keygen') {
              let i = 0;
              let keys = [];

              while (i < 10) {
                await utils.genKeypair().then(k => {
                  keys.push(k);
                  i += 1;
                }).catch(err => console.log('[WARN] gen keypair %s', err.message));
              }

              // 响应
              task_qrcode.push(
                format_response('pong.keygen', keys.join(','))
              );
            }

            // 请求签名交易
            if (action === 'ping.txsign') {
              let [ uuid, pubkeys, tx_buffer ] = params;

              let type = 'pong.txsign';
              let resp = await utils.sign({ pubkeys, tx_buffer });

              // 签名失败
              if (resp instanceof Error) {
                task_qrcode.push(
                  format_response(
                    type,
                    uuid + DELIMITER + resp.message
                  )
                );
              }
              // 签名成功
              else {
                task_qrcode.push(
                  format_response(
                    type,
                    uuid + DELIMITER +'SUCCESS'+ DELIMITER + resp.join(',')
                  )
                );
              }
            }

          } // end if (!offline)

          // 托管钱包生成完成
          if (action === 'pong.keygen') {
            task_notify.push(format_response('keygen', params));
          }

          // 交易签名完成
          if (action === 'pong.txsign') {
            task_notify.push(format_response('txsign', params.join(DELIMITER)));
          }

        }
      } // end if (result)

      timer = setTimeout(run, 100);
    };

    // manual once
    run().then(() => console.log('[INFO] Scan handler start...'));

    return () => {
      clearTimeout(timer);
    };
  }, [offline, setX]);

  /// XXX: 生成响应二维码
  useEffect(() => {
    let timer = null

    const run = async () => {
      let next = task_qrcode.pop();
      setY(task_qrcode.length);

      if (next) {
        await QRCode.toDataURL(next, { scale }).then(url => {
          console.log('[DEBUG] qrcode content: %s', next);
          setUrl(url);
        }).catch(err => console.log('[ERROR] QRCode toDataURL: %o', err));
      } else {
        // 没有任务清理屏幕
        setUrl(null);
      }

      timer = setTimeout(run, duration);
    };

    // manual once
    run().then(() => console.log('[INFO] Ping/pong handler start...'));

    return () => {
      clearTimeout(timer);
    };

  }, [scale, duration, setUrl, setY]);

  /// XXX: 回调通知业务系统
  useEffect(() => {
    let timer = null

    const run = async () => {
      let result = task_notify.pop();
      setZ(task_notify.length);

      if (result) {
        console.log('[DEBUG] notify message: %s', result);

        await fetch(store.get('host') + '/notify', {
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          body: JSON.stringify({ data: result }),
        }).catch(err => console.log('[WARN] notify message: %o', err));
      }

      timer = setTimeout(run, 100);
    };

    // manual once
    if (!offline) {
      run().then(() => console.log('[INFO] Notify handler start...'));
    }

    return () => {
      clearTimeout(timer);
    };

  }, [offline, setZ]);

  /// XXX:
  /// 1. 获取待签名的交易
  /// 2. 检查是否需要生成钱包
  useEffect(() => {
    let timer = null

    const run = async () => {
      // 任务队列满了暂停获取新任务
      if (task_qrcode.length < 1) {

        let result = await fetch(store.get('host') + '/query').then(
          response => response.json()
        ).catch(err => console.log('[WARN] polling query: %o', err));

        if (result && result.sign === utils.hmac(result, SECRET_KEY)) {
          // 1. 需要签名的交易
          if (result.signatures) {
            let arr = result.signatures.split('$');
            for (let tx of arr) {
              task_qrcode.push(format_response('ping.txsign', tx));
            }
          }

          // 2. 需要生成新钱包
          if (result.idle < 2000) {
            task_qrcode.push(format_response('ping.keygen', result.idle));
          }
        }

      }

      timer = setTimeout(run, 1000);
    };

    // manual once
    if (!offline) {
      run().then(() => console.log('[INFO] Polling tx start...'));
    }

    return () => {
      clearTimeout(timer);
    };

  }, [offline]);

  return (
    <>
      <header className="menu">
        <small>{offline ? `S(${x}/${y})` : `P(${x}/${y}/${z})`}</small>
        {menu ? (
          <div>
            {proxy ? (
              <button onClick={() => handleSetProxy()}>MODE</button>
            ) : null}

            {!offline ? (
              <input value={host} onChange={(e) => handleSetHost(e.target.value)} />
            ) : null}

            <button onClick={() => handleSetDuration(duration-100)}>-</button>
            <button>TIME:{duration}</button>
            <button onClick={() => handleSetDuration(duration+100)}>+</button>

            <button onClick={() => handleSetScale(scale-1)}>-</button>
            <button>SIZE:{scale}</button>
            <button onClick={() => handleSetScale(scale+1)}>+</button>

            <button onClick={() => setDebug(!debug)}>ALIGN</button>
            <button onClick={() => toggleMenu(false)}>X</button>
          </div>
        ) : (
          <button onClick={() => toggleMenu(true)}>MENU</button>
        )}
      </header>

      <div className="scanner" style={{ 'opacity': debug ? 1 : 0 }}>
        <video ref={videoEl} style={{ 'width': '100%' }}></video>
      </div>

      <div className="command-qrcode">
        {url ? <img src={url} /> : <span>PENGING...</span>}
      </div>
    </>
  )
}
