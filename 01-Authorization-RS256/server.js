const express       = require('express');
const falcorExpress = require('falcor-express');
const Router        = require('falcor-router');
const jwt           = require('express-jwt');
const dotenv        = require('dotenv');
const bodyParser    = require('body-parser');
const jwtAuthz      = require('express-jwt-authz');
const jwksRsa       = require('jwks-rsa');
const cors          = require('cors');
require('dotenv').config();

const app = express();

app.use(express.static('.'));

if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
  throw 'Make sure you have AUTH0_DOMAIN, and AUTH0_AUDIENCE in your .env file'
}

app.use(cors());

const checkJwt = jwt({
  // Dynamically provide a signing key based on the kid in the header and the singing keys provided by the JWKS endpoint.
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),

  // Validate the audience and the issuer.
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
});

const checkScopes = jwtAuthz([ 'read:messages' ]);

app.use('/api/public/model.json', falcorExpress.dataSourceRoute(function(req, res) {
  return new Router([
    {
      route: 'public.message',
      get: function(pathSet) {
        return { path:['public', 'message'], value: 'Hello from a public endpoint! You don\'t need to be authenticated to see this.' };
      }
    }
  ]);
}));

app.use('/api/private/model.json', checkJwt, falcorExpress.dataSourceRoute(function(req, res) {
  return new Router([
    {
      route: "private.message",
      get: function(pathSet) {
        return { path:['private', 'message'], value: 'Hello from a private endpoint! You need to be authenticated to see this.' };
      }
    }
  ]);
}));

app.use('/api/private-scoped/model.json', checkJwt, checkScopes, falcorExpress.dataSourceRoute(function(req, res) {
  return new Router([
    {
      route: 'private_scoped.message',
      get: function(pathSet) {
        return { path:['private_scoped', 'message'], value: 'Hello from a private endpoint! You need to be authenticated and have a scope of read:messages to see this.' };
      }
    }
  ]);
}));

app.listen(3000);
