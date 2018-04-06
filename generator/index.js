/*globals window, document, pryv */

var pryvHF = {
  pryvConn: null, // global holder for the connection
  measures: {
    mouseX: {
      event: null,
      buffer: []
    },
    mouseY: {
      event: null,
      buffer: []
    },
    orientationGamma: {
      event: null,
      buffer: []
    },
    orientationBeta: {
      event: null,
      buffer: []
    }
  }

};

/*globals document, pryv*/
(function () {

  window.addEventListener('deviceorientation', function (event) {

    var now = Date.now() / 1000;
    xLabel.innerHTML =  event.gamma;
    yLabel.innerHTML =   event.beta;

    pryvHF.measures.orientationGamma.buffer.push([now, event.gamma]);
    pryvHF.measures.orientationBeta.buffer.push([now, event.beta]);

    counter += 2;
  });



  var xLabel = document.getElementById('xLabel');
  var yLabel = document.getElementById('yLabel');
  var frequencyLabel = document.getElementById('frequencyLabel');
  var dataSentLabel = document.getElementById('dataSent');
  var dataBufferLabel = document.getElementById('dataBuffer');

  var samplingMs = 100;

  var counter = 0;
  var previousTick = Date.now()


  document.onmousemove = function (event) {
    var now = Date.now() / 1000;
    xLabel.innerHTML =  event.pageX;
    yLabel.innerHTML =  event.pageY;

    pryvHF.measures.mouseX.buffer.push([now, event.pageX]);
    pryvHF.measures.mouseY.buffer.push([now, event.pageY]);
    counter += 2;
  };

  function sampleHz() {
    var now = Date.now();
    frequencyLabel.innerHTML = Math.round(counter * 1000 /  (now - previousTick));
    dataBufferLabel.innerHTML = 0; // xBuffer.length;
    counter = 0;
    previousTick = now;
    setTimeout(sampleHz, samplingMs);
  }

  sampleHz();

  // --- Post logic

  var samplePostMs = 100;


  var sendCount = 0;

  function samplePost() {

    for (var key in pryvHF.measures) {
      // skip loop if the property is from prototype
      if (!pryvHF.measures.hasOwnProperty(key)) { continue; }

    }


    console.log(pryvHF.measures.mouseX.event, pryvHF.measures.mouseX.buffer.length);
    if (pryvHF.measures.mouseX.event && pryvHF.measures.mouseX.buffer.length > 0) {
      var nBuffer = pryvHF.measures.mouseX.buffer;
      pryvHF.measures.mouseX.buffer = [];
        postSerie(pryvHF.pryvConn, pryvHF.measures.mouseX.event, nBuffer, function (/* err, res */) {
        sendCount += nBuffer.length;
        dataSentLabel.innerHTML = sendCount;
      });
    }
    setTimeout(samplePost, samplePostMs);

  }

  samplePost();

})();


function postBatch(connection, event, points, done) {

  connection.request({
    withoutCredentials: true,
    method: 'POST',
    path: '/series/batch',
    jsonData: {
      format: 'seriesBatch',
      data: [
        {
          eventId: event.id,
          data: {
            format: 'flatJSON',
            fields: event.content.fields,
            points: points
          }
        }
      ]
    },
    callback: done
  });
}


function postSerie(connection, event, points, done) {
  connection.request({
    withoutCredentials: true,
    method: 'POST',
    path: '/events/' + event.id + '/series',
    jsonData: {
      format: 'flatJSON',
      fields: event.content.fields,
      points: points
    },
    callback: done
  });
}


function setupConnection(connection) {
  // A- retrieve previously created events or create events holders

  var postData = [
    {
      method: 'streams.create',
      params: {
        id: 'hfdemo-mouse-x',
        name: 'Mouse-X',
        parentId: 'hfdemo'
      }
    },
    {
      method: 'streams.create',
      params: {
        id: 'hfdemo-mouse-y',
        name: 'Mouse-Y',
        parentId: 'hfdemo'
      }
    },
    {
      method: 'events.create',
      params: {
        streamId: 'hfdemo-mouse-x',
        type: 'series:count/generic',
        description: 'Holder for x mouse position'
      }
    },
    {
      method: 'events.create',
      params: {
        streamId: 'hfdemo',
        type: 'series:angle/deg',
        description: 'Holder for device gamma'
      }
    }
  ];


  var resultTreatment = [
    null,
    null,
    function handleCreateEventX(result) {
      pryvHF.measures.mouseX.event = result.event;
      console.log('handle xEvent set', pryvHF.xEvent);
    },
    function handleCreateEventGamma(result) {
      pryvHF.measures.orientationGamma.event = result.event;
      console.log('handle gammaEvent set', pryvHF.gammaEvent);
    }
  ];


  connection.request({
    method: 'POST',
    path: '/',
    jsonData: postData,
    callback: function (err, result, resultInfo) {
      if (err) { return console.log('...error: ' + JSON.stringify([err, result])); }
      console.log('...event created: ' + JSON.stringify(result));
      if (result && result.results) {
        for (var i = 0; i < result.results.length; i++) {
          if (resultTreatment[i]) {
            resultTreatment[i].call(null, result.results[i]);
          }
        }
      } else {
        console.log(' No result!!', resultInfo);
      }

    }
  });


  pryvHF.pryvConn = connection;

}





/// -------------------------- Pryv Connection Boiler Plate ---------------------------------- ///


/**
 * retrieve the registerURL from URL parameters
 */
function getRegisterURL() {
  return pryv.utility.urls.parseClientURL().parseQuery()['reg-pryv'] ||
    pryv.utility.urls.parseClientURL().parseQuery()['pryv-reg'];
}

var customRegisterUrl = getRegisterURL();
if (customRegisterUrl) {
  pryv.Auth.config.registerURL = {host: customRegisterUrl, 'ssl': true};
}

/**
 * retrieve the registerURL from URL parameters
 */
function getSettingsFromURL() {
  var settings = {
    username : pryv.utility.urls.parseClientURL().parseQuery().username,
    domain : pryv.utility.urls.parseClientURL().parseQuery().domain,
    auth: pryv.utility.urls.parseClientURL().parseQuery().auth
  };

  if (settings.username && settings.auth) {
    return settings;
  }

  return null;
}

function setupShareLink(/* connect */) {
  var urlLabel = document.getElementById('sharelink');
  urlLabel.innerHTML = ('<a target="_new" ' +
    'href="https://pryv.github.io/app-web-plotly/?pryv-reg=reg.preview.pryv.tech&liverange=0.2">' +
    'FOLLOW ON PLOTLY APP</A>');
}

document.onreadystatechange = function () {

  document.getElementById('loading').style.display = 'none';
  document.getElementById('logo-pryv').style.display = 'block';
  var state = document.readyState;
  if (state === 'complete') {
    var settings = getSettingsFromURL();
    if (settings) {
      var connection = new pryv.Connection(settings);
      connection.fetchStructure(function () {
        setupConnection(connection);
      });
    } else {

      // Authenticate user
      var authSettings = {
        requestingAppId: 'app-web-hfdemo',
        requestedPermissions: [
          {
            streamId: 'hfdemo',
            defaultName: 'Demo HF',
            level: 'manage'
          }
        ],
        returnURL: false,
        spanButtonID: 'pryv-button',
        callbacks: {
          needSignin: null,
          needValidation: null,
          signedIn: function (connect) {
            setupShareLink(connect);
            connect.fetchStructure(function () {
              setupConnection(connect);
            });
          }
        }
      };
      pryv.Auth.setup(authSettings);
    }
  }
};