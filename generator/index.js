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
  var previousTick = Date.now();
  var sentCount = 0;


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


  function samplePost() {


    /**
    for (var key in pryvHF.measures) {
      // skip loop if the property is from prototype
      if (!pryvHF.measures.hasOwnProperty(key)) { continue; }


      console.log(key, pryvHF.measures[key].event, pryvHF.measures[key].buffer.length);
      if (pryvHF.measures[key].event && pryvHF.measures[key].buffer.length > 0) {
        var nBuffer = pryvHF.measures[key].buffer;
        pryvHF.measures[key].buffer = [];
        postSerie(pryvHF.pryvConn, pryvHF.measures[key].event, nBuffer, function (err, res ) {
          sentCount += nBuffer.length;
          dataSentLabel.innerHTML = sendCount;
        });
      }
    } **/


    if (pryvHF.pryvConn) {
      postBatch(pryvHF.pryvConn, pryvHF.measures, function (err, res, count) {
        sentCount += count;
        dataSentLabel.innerHTML = sentCount;
      });
    }


    setTimeout(samplePost, samplePostMs);

  }

  samplePost();

})();


function postBatch(connection, measures, done) {

  var data = [];
  var sendCount = 0;

  for (var key in measures) {
    // skip loop if the property is from prototype
    if (! measures.hasOwnProperty(key)) { continue; }


    // console.log(key, measures[key].event, measures[key].buffer.length);
    if (measures[key].event && measures[key].buffer.length > 0) {
      var points = measures[key].buffer;
      sendCount += points.length;
      measures[key].buffer = [];
      data.push({
        eventId: measures[key].event.id,
        data: {
          format: 'flatJSON',
          fields: measures[key].event.content.fields,
          points: points
        }
      });

    }
  }

  if (sendCount === 0) { return done(null, null, 0);}

  connection.request({
    withoutCredentials: true,
    method: 'POST',
    path: '/series/batch',
    jsonData: {
      format: 'seriesBatch',
      data: data
    },
    callback: function (err, res) { done(err, res, sendCount); }
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


function stdPlotly(key, type, name) {
  var data = {};
  data[type] = {
     plotKey: key,
      trace: {
        type: 'scatter',
        name: name,
        mode: 'lines',
        connectgaps: 0
      }

  }

  return { 'app-web-plotly' : data };
}

function setupConnection(connection) {
  // A- retrieve previously created events or create events holders

  var postData = [
    // MOUSE
    {
      method: 'streams.create',
      params: {
        id: 'hfdemo-mouse-x',
        name: 'Mouse-X',
        parentId: 'hfdemo'
      }
    },
    {
      method: 'streams.update',
      params: {
        id: 'hfdemo-mouse-x',
        update: { 
          clientData: stdPlotly('Mouse', 'count/generic', 'X')
        }
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
      method: 'streams.create',
      params: {
        id: 'hfdemo-mouse-y',
        name: 'Mouse-Y',
        parentId: 'hfdemo'
      }
    },
    {
      method: 'streams.update',
      params: {
        id: 'hfdemo-mouse-y',
        update: { 
          clientData: stdPlotly('Mouse', 'count/generic', 'Y')
        }
      }
    },
    {
      method: 'events.create',
      params: {
        streamId: 'hfdemo-mouse-y',
        type: 'series:count/generic',
        description: 'Holder for y mouse position'
      }
    },
    // DEVICE ORIENTATION
    {
      method: 'streams.create',
      params: {
        id: 'hfdemo-orientation-gamma',
        name: 'Orientation-Gamma',
        parentId: 'hfdemo'
      }
    },
    {
      method: 'streams.update',
      params: {
        id: 'hfdemo-orientation-gamma',
        update: {
          clientData: stdPlotly('Orientation', 'angle/deg', 'Gamma')
        }
      }
    },
    {
      method: 'events.create',
      params: {
        streamId: 'hfdemo-orientation-gamma',
        type: 'series:angle/deg',
        description: 'Holder for device gamma'
      }
    },
    {
      method: 'streams.create',
      params: {
        id: 'hfdemo-orientation-beta',
        name: 'Orientation-Beta',
        parentId: 'hfdemo'
      }
    },
    {
      method: 'streams.update',
      params: {
        id: 'hfdemo-orientation-beta',
        update: {
          clientData: stdPlotly('Orientation', 'angle/deg', 'Beta')
        }
      }
    },
    {
      method: 'events.create',
      params: {
        streamId: 'hfdemo-orientation-beta',
        type: 'series:angle/deg',
        description: 'Holder for device beta'
      }
    }
  ];


  var resultTreatment = [
    null,
    null,
    function handleCreateEventX(result) {
      pryvHF.measures.mouseX.event = result.event;
      console.log('handle xEvent set', result.event);
    },
    null,
    null,
    function handleCreateEventY(result) {
      pryvHF.measures.mouseY.event = result.event;
      console.log('handle yEvent set', result.event);
    },
    null,
    null,
    function handleCreateEventGamma(result) {
      pryvHF.measures.orientationGamma.event = result.event;
      console.log('handle gammaEvent set', result.event);
    },
    null,
    null,
    function handleCreateEventBeta(result) {
      pryvHF.measures.orientationBeta.event = result.event;
      console.log('handle betaEvent set', result.event);
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