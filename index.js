/** Node Application to interface between DialogFlow Request and WCS API's */
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const HTTP_SUCCESS_CODE = 200;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/** Webhook for Express Checkout Service*/
app.post('/express_checkout', (req, res) => {
    const requestBodyParams = req.body.queryResult.parameters;

    
    /** construct parameters to call WCS Express Checkout service */
    var options = {
        headers: { 'Content-Type': 'application/json' },
        url: 'https://192.168.106.128:443/wcs/resources/store/1/express_checkout',
        method: 'POST',
        body: requestBodyParams,
        requestCert: false,
        rejectUnauthorized: false,
        json: true
    };

    /**Call WCS Register Person API and handle success/failure scenarios */
    request(options, function (error, response) {
        if (error) {
            createAndSendResponse(res, HTTP_SUCCESS_CODE, JSON.stringify(error));
        } else {
            console.log(response.body.response);
            createAndSendResponse(res, HTTP_SUCCESS_CODE, response.body.response);
        }
    });
});

/** Function to create repsonse for success and failure scenarios */
function createAndSendResponse(res, statusCode, speechText) {
    res.status(statusCode).json({
        fulfillmentText:speechText
    }).send();
}

/** Specify PORT number for express server to run */
const server = app.listen(process.env.PORT || 5000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});