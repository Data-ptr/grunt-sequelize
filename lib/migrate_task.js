'use strict';

var Umzug = require('umzug');
var Sequelize = require('sequelize');
var DataTypes = require('sequelize/lib/data-types');

var Qdbc = require('quick_database_create');

function createMigrator(opts) {
    var db = undefined;

    Qdbc.createDatabaseFrom(opts);

    if(opts.use_env_variable) {
        db = new Sequelize(process.env[opts.use_env_variable], opts);
    }
    else {
        db = new Sequelize(opts.database, opts.username, opts.password, opts);
    }

    if(!db) {
        opts.inspect = function() {
            var temp = JSON.parse(JSON.stringify(opts));

            if(opts.use_env_variable) {
                temp.use_env_variable = opts.use_env_variable.replace(/:[^@]*@/,':--HIDDEN--@');
            }

            if(opts.password) {
                opts.password = '--HIDDEN--';
            }

            return temp;
        };

        grunt.log.error('Failed to connect to databsae via Sequilize with options: ' + require('util').inspect(opts));
    }

  return new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize: db,
      tableName: 'SequelizeMeta'
    },
    upName: 'up',
    downName: 'down',
    migrations: {
      params: [ db.getQueryInterface(), DataTypes ],
      path: opts.migrationsPath,
      pattern: /\.js$/
    },
    logging: opts.log
  });
}

module.exports = function createMigrateTask(opts) {
  var migrator = createMigrator(opts);

  var task = Object.create(migrator);
  task.undo = task.down;

  task.redo = function () {
    return this.down()
      .bind(this)
      .then(function () {
        return this.up();
      });
  };

  return task;
};

module.exports.createMigrator = createMigrator;
