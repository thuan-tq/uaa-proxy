/*******************************************************
The predix-webapp-starter Express web application includes these features:
  * routes to mock data files to demonstrate the UI
  * passport-predix-oauth for authentication, and a sample secure route
  * a proxy module for calling Predix services such as asset and time series
*******************************************************/
var http = require('http'); // needed to integrate with ws package for mock web socket server.
var express = require('express');
var expressProxy = require('express-http-proxy');
var path = require('path');
var cookieParser = require('cookie-parser'); // used for session cookie
var bodyParser = require('body-parser');
// get config settings from local file or VCAPS env var in the cloud
var fs = require("fs");
var HttpsProxyAgent = require('https-proxy-agent');

var corporateProxyServer = process.env.http_proxy || process.env.HTTP_PROXY || process.env.https_proxy || process.env.HTTPS_PROXY;
var corporateProxyAgent;
if (corporateProxyServer) {
  corporateProxyAgent = new HttpsProxyAgent(corporateProxyServer);
}

// configure passport for authentication with UAA
// getting user information from UAA
var app = express();
var httpServer = http.createServer(app);

/**********************************************************************
       SETTING UP EXRESS SERVER
***********************************************************************/
app.set('trust proxy', 1);


//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));

/****************************************************************************
  SET UP EXPRESS ROUTES
*****************************************************************************/

//app.use('/login', express.static(path.join(__dirname, '../public/login1.html')));
//app.use('/resources/predix/images/', express.static(path.join(__dirname, '../public/resources/predix/images/')));
//app.use('/resources/predix/stylesheets/', express.static(path.join(__dirname, '../public/resources/predix/stylesheets/')));


app.post('/saml/SSO/alias/*', bodyParser.urlencoded({ extended: false }),
  function(req, res, next) {
    console.log('/saml/SSO/alias/ ==== request url:' + req.url);
    console.log('Request path: '+ req.path + ',originalUrl:' + req.originalUrl + ', headers: ' + JSON.stringify(req.headers));
      var samlRes="";
      if (req.body && req.body.SAMLResponse) {
       // console.log(JSON.stringify(req.body));
        samlRes = req.body.SAMLResponse;
        decodedSaml = new Buffer(samlRes, 'base64').toString();
        decodedSaml = decodedSaml.replace(process.env.PROXY_URI, process.env.UAA_URI);
        decodedSaml = decodedSaml.replace(process.env.PROXY_URI, process.env.UAA_URI);

        //remove XML signing in SAMLResponse
        xmldom = require("xmldom");
        xmlDocument = (new xmldom.DOMParser()).parseFromString(decodedSaml);
        var nodes = xmlDocument.getElementsByTagName('ds:Signature');
        
        node0 = nodes[0];
        if (node0) {
          xmlDocument.removeChild(node0);
        }
        node1 = nodes[1];
        if (node1) {
          xmlDocument.removeChild(node1);
        }
    
        decodedSaml = xmlDocument.toString();
        samlRes= new Buffer(decodedSaml).toString('base64');
      }

      var request = require('request');
      

      var headers = req.headers;
      delete headers['content-length'];
      delete headers['host'];
      delete headers['connection'];
      //delete headers['upgrade-insecure-requests'];
      var form = {
        SAMLResponse: samlRes
      };
      var options = {
        url: process.env.UAA_URI + '/saml/SSO/alias/' + process.env.SAML_SP_ENTITY_ID,
        headers: headers,
        form: form
      };

  
  request.post(options, function(err, response, body) {
    if (!err && response.statusCode == 200) {
      console.log(body);
      res.status(response.statusCode).send(response.body);
    } else {
      for (k in response.headers) {
        res.set(k, response.headers[k]);
      }

      var redirectUri = res.get('location');

      if (redirectUri) {
        redirectUri= redirectUri.replace(process.env.UAA_URI, process.env.PROXY_URI);
        res.set('location', redirectUri);
      } 

      // var cookie = response.headers['set-cookie'];

      // if (cookie) {
      //   //Make HTTPS -> HTTP proxying work correctly. 
      //   if (Array.isArray(cookie)) {
      //     var cok = cookie.map(function(item) {
      //         return item.replace('; Secure', '');
      //     });
      //     res.set('set-cookie', cok);
      //   }
      // }
      // console.log('Set cookie:' + JSON.stringify(res.get('set-cookie')));

      res.status(response.statusCode).send(response.body);

    }
  });
  }
);



app.get('/saml/login/alias/*',
  function(req, res, next) {
    console.log('Request url: '+ req.url + ',originalUrl:' + req.originalUrl + ', headers: ' + JSON.stringify(req.headers));
      var samlRes="";
      var request = require('request');
      var headers = req.headers;
      console.log("Headers============="+ JSON.stringify(headers));

      delete headers['content-length'];
      delete headers['host'];
      delete headers['connection'];
      //delete headers['upgrade-insecure-requests'];
      var options = {
        url: process.env.UAA_URI + req.originalUrl,
        headers: headers
      };

  
      request.get(options, function(err, response, body) {
        if (!err && response.statusCode == 200) {
        var fs = require("fs"),
        xmldom = require("xmldom");
        xmlDocument = (new xmldom.DOMParser()).parseFromString(body);
        var nodes = xmlDocument.getElementsByTagName('input');

      //   var cookie = response.headers['set-cookie'];

      //   if (cookie) {
      //     //Make HTTPS -> HTTP proxying work correctly. 
      //     if (Array.isArray(cookie)) {
      //       var cok = cookie.map(function(item) {
      //           return item.replace('; Secure', '');
      //       });
      //       res.set('set-cookie', cok);
      //     }
      //   }
      // console.log('Set cookie:' + JSON.stringify(res.get('set-cookie')));


        var samlReq = nodes[0].getAttribute('value');
        if (samlReq) {
         decodedSamlReq = new Buffer(samlReq, 'base64').toString();
            decodedSamlReq = decodedSamlReq.replace(process.env.UAA_URI, process.env.PROXY_URI);
            samlReq= new Buffer(decodedSamlReq).toString('base64');
            nodes[0].setAttribute('value', samlReq);
        }
          res.status(response.statusCode).send(xmlDocument.toString());
        } else {
          res.status(response.statusCode).send(response.body);

        }
      });
  }
);


app.use('/*', 
  function(req, res, next) {
    console.log('Request url: '+ req.url + ', Method: ' + req.method + ',originalUrl:' + req.originalUrl + ', headers: ' + JSON.stringify(req.headers));
    next();
  },
  expressProxy(process.env.UAA_URI, {
      https: true,
      proxyReqPathResolver: function(req) {
        var path = req.originalUrl;//require('url').parse(req.originalUrl).path;
        console.log('proxying to:', path);
          return path;
        },
      
      userResDecorator: cleanResponseHeaders,
      proxyReqOptDecorator: function(proxyReqOpts, srcReq) {
            if (corporateProxyAgent) {
              proxyReqOpts.agent = corporateProxyAgent;
            }
            console.log("proxyReqOpts====" + JSON.stringify(proxyReqOpts));
            return proxyReqOpts;
        }
      }
  ));


  function cleanResponseHeaders (rsp, data, req, res) {
    var redirectUri = res.get('Location');
    if (redirectUri) {
      redirectUri= redirectUri.replace(process.env.UAA_URI, process.env.PROXY_URI);
      res.set('Location', redirectUri);
    } 
    // var cookie = res.get('set-cookie');
    // if (cookie) {
    //   if (Array.isArray(cookie)) {
    //     var cok = cookie.map(function(item) {
    //         console.log('Cookie item:' + JSON.stringify(item));
    //         return item.replace('; Secure', '');
    //     });
    //     res.set('set-cookie', cok);
    //   }
    // }
    console.log('Set cookie:' + JSON.stringify(res.get('set-cookie')));
    datat = data.toString('utf8');
    return datat;
}


////// error handlers //////
// catch 404 and forward to error handler
app.use(function(err, req, res, next) {
  console.error(err.stack);
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler - prints stacktrace
  app.use(function(err, req, res, next) {
    if (!res.headersSent) {
      res.status(err.status || 500);
      res.send({
        message: err.message,
        error: err
      });
    }
  });


// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  if (!res.headersSent) {
    res.status(err.status || 500);
    res.send({
      message: err.message,
      error: {}
    });
  }
});

httpServer.listen(process.env.VCAP_APP_PORT || 5000, function () {
  console.log ('Server started on port: ' + httpServer.address().port);
});

module.exports = app;
