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
      postBatch(pryvHF.pryvConn, pryvHF.measures, function (err, res, count) {
        sentCount += count;
        dataSentLabel.innerHTML = sentCount;
      });
    }
    setTimeout(samplePost, samplePostMs);
  }

  samplePost();

})();


// Create JSON and Push to API
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




// initialize the account and create a handler for the measure
function setupConnection(connection) {
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

function setupShareLink(connect) {
  var urlLabel = document.getElementById('sharelink');
  urlLabel.innerHTML = ('<a target="_new" ' +
    'href="reader.html?pryv-reg=reg.preview.pryv.tech">' +
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