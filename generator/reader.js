/*globals window, document, pryv */


var rLabel = document.getElementById('rLabel');
var frequencyLabel = document.getElementById('frequencyLabel');

var monitor;

var pullSerieFrequencyMs = 100;
var pullSerieFrequencyMsIfEmpty = 1000;


document.onreadystatechange = function () {

  document.getElementById('loading').style.display = 'none';
  document.getElementById('logo-pryv').style.display = 'block';
  var state = document.readyState;
  if (state == 'complete') {
    var settings = getSettingsFromURL();
    if (settings) {
      var connection = new pryv.Connection(settings);
      connection.fetchStructure(function () {
        setupMonitor(connection);
      });
    } else {

      // Authenticate user
      var authSettings = {
        requestingAppId: 'appweb-hf-reader',
        requestedPermissions: [
          {
            streamId: '*',
            level: 'read'
          }
        ],
        returnURL: false,
        spanButtonID: 'pryv-button',
        callbacks: {
          needSignin: null,
          needValidation: null,
          signedIn: function (connect) {
            connect.fetchStructure(function () {
              setupMonitor(connect);
            });
          }
        }
      };
      pryv.Auth.setup(authSettings);
    }
  }
};


// MONITORING
// Setup monitoring for remote changes
function setupMonitor(connection) {
  setupShareLink(connection);

  document.getElementById('loading').style.display = 'block';
  document.getElementById('logo-pryv').style.display = 'none';
  var filter = new pryv.Filter({limit: 10000});
  monitor = connection.monitor(filter);

  // should be false by default, will be updated in next lib version
  // to use fullCache call connection.ensureStructureFetched before
  monitor.ensureFullCache = false;
  monitor.initWithPrefetch = 0; // default = 100;


  // get notified when monitoring starts
  monitor.addEventListener(pryv.MESSAGES.MONITOR.ON_LOAD, function (events) {

    document.getElementById('loading').style.display = 'none';
    document.getElementById('logo-pryv').style.display = 'block';
    updateValues(events);

  });

  // get notified when data changes
  monitor.addEventListener(pryv.MESSAGES.MONITOR.ON_EVENT_CHANGE, function (changes) {
    updateValues(changes.created);
  });

  // start monitoring
  monitor.start(function (/**err**/) {
  });
}

// new events reiceved just keep the last event as reference
function updateValues(events) {
  events.map(function (event) {
    if (event.type.startsWith('series:')) {
      if (! lastEvent || lastEvent.timeLT < event.timeLT) {

        lastEvent = event;
      }

    }
  });
}


// event to fetch
var lastEvent = null;
// last fetch
var fromTime = 0;
var counter = 0;


var lastFetch = 0;

function fetchSerie(done) {
  if (! lastEvent) { return done(0); }
  lastEvent.connection.request({
    withoutCredentials: true,
    method: 'GET',
    path: '/events/' + lastEvent.id + '/series?fromTime=' + (fromTime + 0.0001),
    callback: function (err, res) {
      var l = 0;
      if (res && res.points && res.points.length > 0) {
        l = res.points.length;

        var now =   Date.now();
        var deltaTime = (now - lastFetch) / 1000;
        lastFetch = now;
        var frequency = Math.round(l / deltaTime);


        fromTime = res.points[l - 1][0]; // last measure time
        counter += l;

        frequencyLabel.innerHTML = frequency;
        rLabel.innerHTML = counter;
      }
      done(l);
    }
  });
}




function pull() {
  fetchSerie(function (count) {
    var nextPullIn = count ? pullSerieFrequencyMs : pullSerieFrequencyMsIfEmpty;

    setTimeout(pull, nextPullIn);
  });
}

pull(); // start the pulling



/*globals document, pryv*/

var xLabel = document.getElementById('xLabel');
var yLabel = document.getElementById('yLabel');
var frequencyLabel = document.getElementById('frequencyLabel');
var dataSentLabel = document.getElementById('dataRead');

var samplingMs = 100;

var counter = 0;
var previousTick = Date.now();
var sentCount = 0;



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
  urlLabel.innerHTML = ('<A TARGET="_NEW" HREF="' + document.location).split('?')[0] +
    '?username=' + connect.username +
    '&domain=' + connect.domain +
    '&auth=' + connect.auth + '">SHARE</A>';
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
        setupMonitor(connection);
      });
    } else {

      // Authenticate user
      var authSettings = {
        requestingAppId: 'app-web-hfdemo-reader',
        requestedPermissions: [
          {
            streamId: 'hfdemo',
            defaultName: 'Demo HF',
            level: 'read'
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
              setupMonitor(connect);
            });
          }
        }
      };
      pryv.Auth.setup(authSettings);
    }
  }
};