# Test the demo

1. Run the mqtt broker on the server side, should be inside `liangwei@159.100.240.26:/mqtt_broker/src` and please run `node run_broker.js` and ensure that `redis` and `nginx` are running

2. Clone the repo to local `git clone git@github.com:pryv/app-web-mqtt-demo.git`

3. Navigate to `app-web-mqtt-demo/generator` and start server locally, for instance run `python3 -m http.server 8000` to have it hosted at port 8000.

4. Open the browser and go to `localhost:8000` if the port specified in last step is `8000` and test the functionality. Notice that after login, one might need to wait for some time for the data to be visualized on the tracking page. Please refresh or click the button `Follow on the plotly app` again in case the data are not visualized.
