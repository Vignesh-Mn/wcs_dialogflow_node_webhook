/** Node Application to interface between DialogFlow Request and WCS API's */
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const expressApp = express().use(bodyParser.json())
expressApp.use(bodyParser.urlencoded({ extended: true }));

//Onject holding REST API URI details.
const RESTParams = {
    HTTPS_PROTOCOL: 'https://',
    COMMERCE_IP: '192.168.106.128',
    COMMERCE_HTTPS_PORT: '443',
    COMMON_CONTEXT_ROOT: 'wcs/resources/store/1/voice_checkout/',
    COLON: ':',
    FORWARD_SLASH: '/'
}

//Object holding intent names as in Dialogflow
const INTENTS = {
    WELCOME_INTENT: 'default_intent',
    SIGN_IN_INTENT: 'get_sign_in',
    ITEM_ADD_INTENT: 'item_add',
    EXPRESS_CHECKOUT_INTENT: 'express_checkout',
    FALLBACK_INTENT: 'default_fallback_intent',
    CART_DETAILS: 'cart_details',
    QUESTION_MARK: '?'
}

// Import the appropriate service and chosen wrappers
const { dialogflow, SignIn, List } = require('actions-on-google');

// Create an app instance
const app = dialogflow({ clientId: '6ff1e73057434cf4a39715fbeac9ce80' });

// Register handlers for Dialogflow intents

// Dialogflow intent default_intent
app.intent(INTENTS.WELCOME_INTENT, (conv, params, signin) => {
    conv.ask(new SignIn('To use the app'));
});

// Create a Dialogflow intent with the `actions_intent_SIGN_IN` event
app.intent(INTENTS.SIGN_IN_INTENT, (conv, params, signin) => {
    if (signin.status === 'OK') {
        const ssml = `<speak> 
        Hi, I can help you checkout using voice.<break time="500ms"/> 
        <p>
            <s>You can add items to cart <break time="500ms"/></s>
            <s>View cart details <break time="500ms"/></s>
            <s>Proceed to checkout \n <break time="1s"/></s>
        </p>
        What do you want to do ?
        </speak>`;
        conv.ask(ssml);
    } else {
        conv.close(`There is some problem syncing with your account. Please try later`);
    }
});

// Dialogflow Intent `item.add`
app.intent(INTENTS.ITEM_ADD_INTENT, conv => {
    const parameters = conv.body.queryResult.parameters;
    /** construct parameters to call WCS Add Item service */
    const data = {
        product: parameters.product,
        idToken: conv.user.profile.token,
        color: parameters.color,
        size: parameters.size,
        brand: parameters.brand,
        quantity: parameters.quantity
    }

    return intentPromise(INTENTS.ITEM_ADD_INTENT, data, conv, 'POST', { 'Content-Type': 'application/json' });
});

// Dialogflow Intent `express_checkout`
app.intent(INTENTS.EXPRESS_CHECKOUT_INTENT, conv => {
    const data = {
        firstName: conv.user.profile.payload.given_name,
        lastName: conv.user.profile.payload.family_name,
        email1: conv.user.profile.payload.email,
        idToken: conv.user.profile.token
    }

    return intentPromise(INTENTS.EXPRESS_CHECKOUT_INTENT, data, conv, 'POST', { 'Content-Type': 'application/json' });
});

// Dialogflow Intent `cart_details`
app.intent(INTENTS.CART_DETAILS, conv => {
    const headers = { 'Content-Type': 'application/json', 'idToken': conv.user.profile.token };

    return intentPromise(`${INTENTS.CART_DETAILS}`, {}, conv, 'GET', headers);
});

// Dialogflow intent default_fallback_intent
app.intent(INTENTS.FALLBACK_INTENT, conv => {
    conv.ask(`I didn't understand. Can you tell me something else?`)
});

/**Endpoint to be exposed to Dialogflow */
expressApp.post('/fulfillment', app);

/** Specify PORT number for express server to run */
const server = expressApp.listen(process.env.PORT || 5000, () => {
    console.log('Express server listening on port %d in %s mode', server.address().port, expressApp.settings.env);
});

// Common builder method to construct request body
class RequestBuilder {
    constructor(url, body, method, headers, requestCert = false, rejectUnauthorized = false, json = true) {
        this.headers = headers;
        this.method = method;
        this.requestCert = requestCert;
        this.rejectUnauthorized = rejectUnauthorized;
        this.json = json;
        this.url = url;
        this.body = body;
    }
}

// Construct WCS base URI
let getWCSBaseUrl = `${RESTParams.HTTPS_PROTOCOL}${RESTParams.COMMERCE_IP}${RESTParams.COLON}${RESTParams.COMMERCE_HTTPS_PORT}${RESTParams.FORWARD_SLASH}${RESTParams.COMMON_CONTEXT_ROOT}`;

/**Common method to call external API's */
let executeRequest = (options, conv, resolve, intentName) => {
    request(options, (error, response) => {
        if (error) {
            console.log('error : ' + error);
            conv.close(`Something went wrong.Please try later`);
            resolve(JSON.stringify(error));
        } else {
            console.log(`Success : ${response.body.response}`);
            conv.ask(response.body.response);
            resolve();
        }
    });
};

//Promise function to return response to intents.
const intentPromise = (intentName, data, conv, httpMethod, headers) => {
    return new Promise(resolve => {
        const options = new RequestBuilder(`${getWCSBaseUrl}${intentName}`, data, httpMethod, headers);
        executeRequest(options, conv, resolve, intentName);
    });
};
