/*globals window, document, pryv */


var pryvHF = {
  pryvConn: null, // global holder for the connection
  measures: {
    random: {
      event: null,
      buffer: []
    }
  }

};


/*globals document, pryv*/
(function () {
  var rLabel = document.getElementById('rLabel');
  var dataSentLabel = document.getElementById('dataSent');


  var sentCount = 0;

  // Loop to create new data
  var samplingCreate = 1;
  function createData() {
    var value =   Math.random();
    rLabel.innerHTML = value;
    pryvHF.measures.random.buffer.push([Date.now() / 1000, value]);
    setTimeout(createData, samplingCreate);
  }
  createData();

  // Loop to Post HF data
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


// initialize the account and create a handler for the measure
async function setupConnection(connection) {
  // A- retrieve previously created events or create events holders


  var postData = [
      {   // Make sure the stream exists
        method: 'streams.create',
        params: {
          id: 'hfdemo-random',
          name: 'Random',
          parentId: 'hfdemo'
        }
      },
      {   // Create a series: event
        method: 'events.create',
        params: {
          streamId: 'hfdemo-random',
          type: 'series:count/generic',
          description: 'Holder for random'
        }
      }
    ];

  var resultTreatment = [
      null,   // handle the result of stream creation (nothing to do)
      function handleCreateEventR(result) { // keep event references
        pryvHF.measures.random.event = result.event;
        console.log('handle rEvent set', result.event);
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

function setupShareLink(connect) {
  var urlLabel = document.getElementById('sharelink');
  urlLabel.innerHTML = ('<a target="_new" ' +
    'href="reader.html?pryv-reg=reg.pryv.me">' +
    'FOLLOW ON READER</A>');
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