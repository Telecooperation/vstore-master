var confHandler   = require('./global_config/vstore_config_handler');

const express       = require('express');
const logger        = require('morgan');
const bodyParser    = require('body-parser');
const pe            = require('parse-error');
const cors          = require('cors');
const api_v1        = require('./routes/v1');
var mongoose        = require('mongoose');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
const CONFIG = require('./env_config');
console.log("Environment: ", CONFIG.app);

// Middleware for MongoDB admin interface
var mongo_express = require('mongo-express/lib/middleware')
var mongo_express_config = require('./mongo_express_config.js')

mongoose.Promise = global.Promise;
mongoose.connect('mongodb://127.0.0.1/vstore_master');
var dbConn = mongoose.connection;
dbConn.once('open', function() 
{
    console.log("MongoDB connection established.!");
    
    confHandler.updateConfigFromFile();
    
    applyRoutes();

    console.log("vStore master node listening on port " + CONFIG.port + "...");
    app.listen(CONFIG.port);

});


//******** Routes ********//

function applyRoutes() {

    app.use(cors());
    app.use('/v1', api_v1);

    app.use('/admin', mongo_express(mongo_express_config))


    //Reply to request received on root route
    app.use('/', function(req, res) {
        res.statusCode = 200;
        res.json({status:"success", message:"vStore Master Node", data:{}});
    });

    // Catch 404 and forward to error handler
    app.use(function(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
    });

    // Error handler
    app.use(function(err, req, res, next) {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.json({status: 'error', message: err.message});
        console.log(res.locals.error);  
    });

    process.on('unhandledRejection', error => {
        console.error('Uncaught Error', pe(error));
    });
}
