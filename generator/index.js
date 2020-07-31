/*globals window, document, pryv */
console.log(token);

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

  var xLabel = document.getElementById('xLabel');
  var yLabel = document.getElementById('yLabel');
  var gLabel = document.getElementById('gLabel');
  var bLabel = document.getElementById('bLabel');
  var frequencyLabel = document.getElementById('frequencyLabel');
  var dataSentLabel = document.getElementById('dataSent');
  var dataBufferLabel = document.getElementById('dataBuffer');

  var samplingMs = 100;

  var counter = 0;
  var previousTick = Date.now();
  var sentCount = 0;

  window.addEventListener('deviceorientation', function (event) {

    var now = Date.now() / 1000;
    gLabel.innerHTML = event.gamma;
    bLabel.innerHTML = event.beta;

    pryvHF.measures.orientationGamma.buffer.push([now, event.gamma]);
    pryvHF.measures.orientationBeta.buffer.push([now, event.beta]);



    counter += 2;
  });


  document.onmousemove = function (event) {
    var now = Date.now() / 1000;
    xLabel.innerHTML = event.pageX;
    yLabel.innerHTML = event.pageY;

    pryvHF.measures.mouseX.buffer.push([now, event.pageX]);
    pryvHF.measures.mouseY.buffer.push([now, event.pageY]);

    counter += 2;
  };



  function sampleHz() {
    var now = Date.now();
    frequencyLabel.innerHTML = Math.round(counter * 1000 / (now - previousTick));
    dataBufferLabel.innerHTML = 0; // xBuffer.length;
    counter = 0;
    previousTick = now;
    setTimeout(sampleHz, samplingMs);
  }

  sampleHz();

  // --- Post logic

  var samplePostMs = 100;

  function samplePost() {

    if (pryvHF.pryvConn) {

      // Construct apiEndpoint
      console.log(pryvHF.pryvConn);
      let suffix = pryvHF.pryvConn.endpoint.split("://")[1];
      let username = suffix.split(".")[0];
      let token = pryvHF.pryvConn.token;
      let apiEndPoint = `https://${token}@${suffix}`;

      // Login mqtt client
      if (!mqttLoggedIn) {
        mqttClient = new MQTTClient(brokerAddr, username); 
        var loggedIn = mqttClient.login(apiEndPoint);
        loggedIn.then( (code) => {
            if (code == 0) {

              // Set loggedin to true
              mqttLoggedIn = true;

              // Trigger first batch posting
              postBatch(mqttClient, pryvHF.measures, function (err, res, count) {
                sentCount += count;
                dataSentLabel.innerHTML = sentCount;
              });
            } else {
              console.log("Fail to log in");
            }

            setTimeout(samplePost, samplePostMs);
        })             
      } else {

        // Trigger batch posting after loggedin set to true
        postBatch(mqttClient, pryvHF.measures, function (err, res, count) {
          sentCount += count;
          dataSentLabel.innerHTML = sentCount;
        });
        setTimeout(samplePost, samplePostMs);
      }
      console.log(`client id ${mqttClient.clientId}`);
     
    } else {
      setTimeout(samplePost, samplePostMs);
    }
  }

  // Keep-alive mqtt client
  var mqttClient = null;
  var mqttLoggedIn = false;
  samplePost();

})();


function postBatch(mqttClient, measures, done) {

  var data = [];
  var sendCount = 0;
  // Generate points to push
  for (var key in measures) {

    // skip loop if the property is from prototype
    if (!measures.hasOwnProperty(key)) { continue; }

    if (measures[key].event && measures[key].buffer.length > 0) {
      
      var points = measures[key].buffer;
      sendCount += points.length;
      measures[key].buffer = [];
      packet = {
        eventId: measures[key].event.id,
        data: {
          format: 'flatJSON',
          fields: measures[key].event.content.fields,
          points: points
        }
      };
      console.log("Bye world");
      console.log(packet);
      mqttClient.createPoints(packet);
      data.push(packet);
    }
  }

  if (sendCount === 0) { return done(null, null, 0); }

  done(null, null, sendCount);
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

  return { 'app-web-plotly': data };
}

async function setupConnection(connection) {
  // A- retrieve previously created events or create events holders

  var postData;
  var resultTreatment;

  postData = [
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

  resultTreatment = [
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


  try {
    const results = await connection.api(postData);
    if (results) {
      for (var i = 0; i < results.length; i++) {
        if (resultTreatment[i]) {
          resultTreatment[i].call(null, results[i]);
        }
      }
    } else {
      console.log(' No result!!', resultInfo);
    }
  } catch (e) {
    console.log(e);
  }
  // connection.request({
  //   method: 'POST',
  //   path: '/',
  //   jsonData: postData,
  //   callback: function (err, result, resultInfo) {
  //     if (err) { return console.log('...error: ' + JSON.stringify([err, result])); }
  //     console.log('...event created: ' + JSON.stringify(result));
  //     if (result && result.results) {
  //       for (var i = 0; i < result.results.length; i++) {
  //         if (resultTreatment[i]) {
  //           resultTreatment[i].call(null, result.results[i]);
  //         }
  //       }
  //     } else {
  //       console.log(' No result!!', resultInfo);
  //     }

  //   }
  // });


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
  pryv.Auth.config.registerURL = { host: customRegisterUrl, 'ssl': true };
}

/**
 * retrieve the registerURL from URL parameters
 */
function getSettingsFromURL() {
  var settings = {
    username: pryv.utility.urls.parseClientURL().parseQuery().username,
    domain: pryv.utility.urls.parseClientURL().parseQuery().domain,
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
    'href="https://pryv.github.io/app-web-plotly/?pryv-reg=reg.pryv.me&liverange=0.2">' +
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
      
      var authSettings = {
        spanButtonID: 'pryv-button', // span id the DOM that will be replaced by the Service specific button
        onStateChange: pryvAuthStateChange, // event Listener for Authentication steps
        authRequest: { // See: https://api.pryv.com/reference/#auth-request
          requestingAppId: 'app-web-hfdemo',
          languageCode: 'fr', // optional (default english)
          requestedPermissions: [
            {
              streamId: 'hfdemo',
              defaultName: 'Demo HF',
              level: 'manage'
            }
          ],
          clientData: {
            'app-web-auth:description': {
              'type': 'note/txt', 'content': 'This is a consent message.'
            }
          },
        }
      };
      
      function pryvAuthStateChange(state) { // called each time the authentication state changed
        console.log('##pryvAuthStateChange', state);
        if (state.id === Pryv.Browser.AuthStates.AUTHORIZED) {
          connection = new Pryv.Connection(state.apiEndpoint);
          console.log(connection);
          setupShareLink();
          setupConnection(connection);
        }
        if (state.id === Pryv.Browser.AuthStates.LOGOUT) {
          connection = null;
          logToConsole('# Logout');
        }
      }
      
      var serviceInfoUrl = "https://reg.pryv.me/service/info";
      (async function () {
        var service = await Pryv.Browser.setupAuth(authSettings, serviceInfoUrl);
      })();

      // pryv.Auth.setup(authSettings);
    }
  }
};