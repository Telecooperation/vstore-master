const fs = require('fs');
const path = require('path');
var NodeInfoModel = require('../models.js').NodeInfo;

var config_handler = {
    readConfigModule: function(module_name) {
        var file_name = module_name+".json";
        var file_path = path.resolve(__dirname, "modules", file_name);
        if(!fs.existsSync(file_path)) { return null; }
        try {
            var mod_file = require(file_path);
            console.log("[ConfigHandler] Successfully read module " + module_name); 
            return mod_file;
        } catch(err) {
            console.log("[ConfigHandler] Failed reading module " + module_name);
            console.log(err); 
        }
        return null;
    },

    markConfigModuleUsed: function(module_name) {
        var file_name = module_name+".json";
        var file_path = path.resolve(__dirname, "modules", file_name);
        if(!fs.existsSync(file_path)) { return null; }
        fs.rename(file_path, file_path + ".done", function(err) {if (err) console.log("Error renaming file: " + err);});
    },

    readConfig: function() {
        //Reads the matching rules from a file config_dir/rules.json
        var rules = this.readConfigModule("rules");
        var nodes = this.readConfigModule("nodes");

        var vConfig = {};
        if(rules != null) {
            vConfig.rules = rules;
        } 
        if(nodes != null) {
            vConfig.nodes = nodes;
        }
        
        vConfig.matchingMode = "RULES_NEXT_ON_NO_MATCH";

        return vConfig;
    },

    updateNodesFromFile: function() {
        var nodes = this.readConfigModule("nodes"); 
        if(nodes == null) { return; }
        //Only insert if not already contained in database
        nodes.forEach(function(node) {            
            NodeInfoModel.find(node, function(err, result) 
            {
                if(err || result.length > 0) { return; }
                if(result.length == 0) {
                    new NodeInfoModel(node).save(function(err) {});
                }
            });
        });
        this.markConfigModuleUsed("nodes");
    },

    updateConfigFromFile: function() {
        this.updateNodesFromFile();
    },
}

module.exports = config_handler;
