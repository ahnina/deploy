const sqlite3 = require("sqlite3").verbose();

module.exports = class DBManager {
    /**
     * Function to create the object
     * @param {String} dbPath 
     */
    constructor(dbPath) {
        this.dbPath = dbPath;
    }
    
    /**
     * Function to return a db run function as a promise using an existent db
     * @param {sqlite3.Database} db 
     * @param {String} sql 
     * @param {Array} values 
     * @returns {Promise(resolve(queryResult), reject(Error))} 
     */
    returnPromiseWithExistentDBRun(db, sql, values=[]) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.run(sql, values,  (err, rows ) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows);
                });
            });
        });
    }
    

    /**
     * Function to return a db all function as a promise using an existent db
     * @param {sqlite3.Database} db 
     * @param {String} sql
     * @param {Array} values 
     * @returns {Promise(resolve(queryResult), reject(Error))} 
     */
    returnPromiseWithExistentDBAll(db, sql, values=[]) {
        return new Promise((resolve, reject) => {
            db.serialize(() => {
                db.all(sql, values,  (err, rows ) => {
                    if (err) {
                        reject(err);
                    }
                    resolve(rows);
                });
            });
        });
    }


    /**
     * Function to make a consult in the given DB
     * @param {String} sql 
     * @param {String} mode 
     * @param {Array} values 
     * @returns {Promise(resolve(queryResult), reject(Error))} 
     */
    returnDBAsPromise(sql, mode="run", values=[]) {
        mode = mode.toLowerCase();
        switch(mode) {
            case "all":
                return new Promise((resolve, reject) => {
                    let db = new sqlite3.Database(this.dbPath);
                    this.returnPromiseWithExistentDBAll(db, sql, values).then((rows) => {
                        resolve(rows);
                    }).catch((err) => {
                        reject(err);
                    })
                    db.close(); 
                });

            case "run":
                return new Promise((resolve, reject) => {
                    let db = new sqlite3.Database(this.dbPath);
                    this.returnPromiseWithExistentDBRun(db, sql, values).then((rows) => {
                        resolve(rows);
                    }).catch((err) => {
                        reject(err);
                    });
                    db.close();
                });
            
            default:
                let error = { 
                    message: "You must specify which mode you want to run your query. The mode should be 'run' or 'all'.",
                    modeTyped: mode,
                    modeAcceptedTypes: ["run", "all"]
                }
                throw new Error(error);
        } 
    }


    /**
     * Function to select data from given database
     * @param {String} query 
     * @param {Array} values 
     * @returns {Promise(resolve(queryResult), reject(Error))} 
     */
    select(query, values=[]) { 
        return this.returnDBAsPromise(query, "all", values);
    }


    /**
     * Function to make an insert sql and return it
     * @param {String} table 
     * @param {Array<string>} columns 
     * @param {Array} values 
     * @returns {Promise(resolve(queryResult), reject(Error))}
     */
    doInsertSql(table, columns) {
        let sql = `INSERT INTO ${table}(${columns.join(", ")}) VALUES `;
        let placeholders = [];
        let placeholderArray = new Array(columns.length);
        placeholderArray.fill("?");
        placeholders.push(`(${placeholderArray.join(", ")})`);
        sql += placeholders.join(", ");
        sql += ";";
        return sql;
    }


    /**
     * Function to insert data in given database
     * @param {String} table 
     * @param {Array<string>} columns 
     * @param {Array} values 
     * @returns {Promise(resolve(queryResult), reject(Error))} 
     */
    insert(table, columns, values) {
        /**
         * It just do a insert per time
         */
        let sql = this.doInsertSql(table, columns);
        return this.returnDBAsPromise(sql, "run", values);
    }


    /**
     * Function to do an insert in the given database and table. Besides, it return the lastID as 
     * the promise value
     * @param {String} table 
     * @param {Array<string>} columns
     * @param {Array} values 
     */
    insertReturningTheInsertedDataID(table, columns, values) {
        /**
         * It just do a insert per time
         */
        let sql = this.doInsertSql(table, columns);
        return new Promise(async (resolve, reject) => {
            let db = new sqlite3.Database(this.dbPath);
            await this.returnPromiseWithExistentDBRun(db, sql, values).then(async () => {
                let selectSql = "SELECT last_insert_rowid();";
                await this.returnPromiseWithExistentDBAll(db, selectSql).then((result) => {
                    resolve(result);
                }).catch((err) => {
                    reject(err);
                });
                db.close(); 
            }).catch((err) => {
                reject(err);
            });
        });
    }


    /**
     * Function to update data in a given database
     * @param {String} table 
     * @param {'object'} data 
     * @param {String} where 
     * @returns {Promise(resolve(queryResult), reject(Error))} 
     */
    update(table, data, where, otherValues=[]) { 
        const sets = Object.keys(data).map((key) => `${key} = ?`).join(", ");
        let values = Object.values(data);
        values = values.concat(otherValues);
        const sql = `UPDATE ${table} SET ${sets} WHERE ${where};`;
        return this.returnDBAsPromise(sql, "run", values);
    }


    /**
     * Function to delete data in a given database
     * @param {String} table 
     * @param {String} where
     * @param {Array} values
     * @returns {Promise(resolve(queryResult), reject(Error))} 
     */
    delete(table, where, values=[]) {
        const sql = `DELETE FROM ${table} WHERE ${where};`;
        return this.returnDBAsPromise(sql, "run", values);
    }
}

