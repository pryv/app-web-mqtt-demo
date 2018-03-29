/*globals document, pryv*/
(function () {

  var xLabel = document.getElementById('xLabel');
  var yLabel = document.getElementById('yLabel');
  var frequencyLabel = document.getElementById('frequencyLabel');

  var samplingMs = 100;

  var counter = 0;
  var previousTick = Date.now();


  document.onmousemove = function (event) {
    xLabel.innerHTML =  event.pageX;
    yLabel.innerHTML =  event.pageY;

    counter += 2;
  };

  function sample() {
    var now = Date.now();

    frequencyLabel.innerHTML = Math.round(counter * 1000 /  (now - previousTick));
    counter = 0;
    previousTick = now;

    setTimeout(sample, samplingMs);
  }

  sample();
})();


function setupConnection(connection) {
  console.log("Connection done!");
}



/// -------------------------- Pryv Connection Boiler Plate ---------------------------------- ///


/**
 * retrieve the registerURL from URL parameters
 */
function getRegisterURL() {
  return pryv.utility.urls.parseClientURL().parseQuery()['reg-pryv'] || pryv.utility.urls.parseClientURL().parseQuery()['pryv-reg'];
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

function setupShareLink (connect) {
  var urlLabel = document.getElementById('sharelink');
  urlLabel.innerHTML = ('' + document.location).split('?')[0] +
    '?username=' + connect.username +
    '&domain=' + connect.domain +
    '&auth=' + connect.auth;
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