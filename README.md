# vstore-master - Master node for vStore
The master node serves configuration to the [vStore](https://github.com/Telecooperation/vstore-framework) framework's clients. This includes
* Global decision rules
* A list of storage nodes
* A global key/value lookup service, which replies to requests of file identifiers with a json array of storage node identifiers, on which the file is stored (based on the in-memory database [lmdb](https://symas.com/lmdb/)).

Please refer to the framework's [main repository](https://github.com/Telecooperation/vstore-framework) and [Wiki](https://github.com/Telecooperation/vstore-framework/wiki) for further documentation about its use. 

## Installation

We assume that nodejs and npm are installed.

To install the master node, please follow these steps:

1. Clone the repository using `git clone https://github.com/Telecooperation/vstore-master`
2. ``cd vstore-master``
3. ``npm install`` to install the necessary packages

## Configuration

Now modify the configuration as it suits your desired setup.

Configure port and lmdb in the file `env_config.js`.

For rules and storage nodes, go to the directory `vstore-master/global_config/modules` and modify the configuration files.
* The file `rules.json` must only contain a json array which defines global storage rules.
* The file `nodes.json` must only contain a json array which defines the storage nodes.

For the layout of the JSON files, see the [vstore-framework wiki](https://github.com/Telecooperation/vstore-framework/wiki/Configuration).

__Important:__ Upon the first start of the master node, the node file will be parsed and the storage node information is put into a MongoDB backend. After this, the file is renamed to `nodes.json.done`.

The rules are currently not stored in a database. Instead, they are served from the json file.

## Using the admin interface to MongoDB backend
To access the MongoDB database more easily and graphically, we use [mongo-express](https://github.com/mongo-express/mongo-express). You can easily add and remove storage node information.

This can be called by visiting `http://<address_of_master>:<port>/admin`. The login credentials can be configured in the file [mongo_express_config.js](https://github.com/Telecooperation/vstore-master/blob/master/mongo_express_config.js) by changing the variables `mongoexpressUser` and `mongoexpressPass`.

### Manually adding rules in the backend
- Open `http://<address_of_master>:<port>/admin` and login
- Click `View` for the database `vstore_master`.
- Click `View` for the collection `nodeinfos`.
- To add a node object, click the button `New Document`.

## Run it

To run the master node server in foreground:
- ``node server.js``

To run the master node in the background:
- Install screen if it is not installed yet: ``sudo apt-get install screen``
- ``Start new screen: screen -dmS <screen name>``
- ``screen -S <screen name> -X stuff 'node server.js\n'``

Attach to screen:
- ``screen -r <screen name>``

Detach from screen:
- While in screen, press ``Ctrl`` + ``A``, and then ``D``.

Kill screen:
- ``screen -S <screen name> -X quit``


## Libraries used:
- [node-lmdb](https://github.com/Venemo/node-lmdb)
- [mongo-express](https://github.com/mongo-express/mongo-express)


