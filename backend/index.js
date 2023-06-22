const express = require('express');
const DBManager = require('./classes/DBManager.js');
const bodyParser = require('body-parser');
const urlencodedParser = bodyParser.urlencoded({ extended: false })

const DBPATH = 'data/project.db';
const DBM = new DBManager(DBPATH)

const hostname = '127.0.0.1';
const port = 1234;
const app = express();

app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static("public/"));


/**
 * Function to format a Date
 * @param {Date} date 
 * @param {String} format 
 * @returns {String}
 */
function formatDate(date, format) {
	const map = {
		mm: (date.getMonth() + 1) < 10 ? ('0' + (date.getMonth() + 1)) : (date.getMonth() + 1),
		dd: date.getDate() < 10 ? ('0' + date.getDate()) : date.getDate(),
		aa: date.getFullYear().toString().slice(-2),
		aaaa: date.getFullYear()
	}

	return format.replace(/mm|dd|aaaa|aa/gi, matched => map[matched])
}


/**
 * Function to change input name to db columns name and do an update
 * @param {String} table 
 * @param {'object'} data 
 * @param {String} where 
 * @param {*} id 
 */
async function changeInputNameToDBNameAndUpdate(table, data, where, id) {
	const dataToDBColumns = {
		"tableID": "ID",
		"connectionID": "ID_CONEXAO",
		"tableDesc": "CONTEUDO_TABELA",
		"tablePath": "CAMINHO",
		"database": "DATABASE",
		"creationDate": "DATA_CRIACAO",
		"lag": "DEFASAGEM",
		"updateFrequency": "FREQUENCIA",
		"datasetData": "CONJUNTODADOS_PRODUTO",
		"ownerData": "OWNER",
		"stewardData": "STEWARD",
		"engResp": "ENG_INGESTAO",
		"mechanics": "MECANICA",
		"fieldID": "ID_VARIAVEL",
		"fieldName": "NOME_CAMPO",
		"fieldType": "TIPO_CAMPO",
		"personType": "TIPO_PESSOA",
		"fieldDesc": "DESCRICAO_CAMPO",
		"isPK": "CH_PRIMARIA",
		"acceptNull": "ACCEPT_NULL",
		"isUNQ": "UNQ",
		"volatile": "VOLATIL",
		"LGPD": "LGPD",
	}

	if (data) {
		for (let index in data) {
			let obj = {}
			let dbIndex = dataToDBColumns[index];
			obj[dbIndex] = data[index];
			await DBM.update(table, obj, where, [id]);
		}
	}
}


/**
 * Function to the Return all data from a table
 * @param {String} id 
 * @returns {Object} JSON with database data
 */
function getTableData(id) {
	return new Promise(async (resolve, reject) => {
		try {
			let sql = "select * from TB_TABELA " +
				"inner join TB_OWNER_STEWARD on " +
				"TB_TABELA.CONJUNTODADOS_PRODUTO = TB_OWNER_STEWARD.CONJUNTO_DADOS " +
				"where ID=?";
			await DBM.select(sql, [id]).then(async (result) => {
				let response = result[0];
				let table = response["TABELA"];
				response["CONEXAO"] = await DBM.select("select * from TB_CONEXAO where TABELA=?", [table]);
				response["VARIAVEL"] = await DBM.select("select * from TB_VARIAVEL where TABELA=?", [table]);
				sql = "select * from TB_CLASSIFICACAO_TABELA where ID_TABELA=?";
				response["CLASSIFICACAO_TABELA"] = await DBM.select(sql, [id]);
				resolve(response);
			});
		} catch (e) {
			reject(e);
		}
	});
}


/**
 * Function to invert the keys with the values
 * @param {Array<Object>} array 
 * @param {String} indexKey
 * @param {String} valueKey 
 * @returns {Object}
 */
function setArrayValueAsKey(array, indexKey, valueKey) {
	let response = {}
	for (let arrayIndex in array) {
		let item = array[arrayIndex];
		let value = item[valueKey];
		let index = item[indexKey];
		response[index] = value;
	}

	return response;
}


/**
 * Function that compare objects and return an array with a Object that contains the given id,
 * the key named as INDEX which the value is differente
 * and this value named as CHANGE
 * @param {Object} item 
 * @param {Object} itemToCompare 
 * @param {String} id 
 * @returns {Array<Object>}
 */
function compareObjects(item, itemToCompare, id = '') {
	let result = [];
	for (let index in item) {
		let itemToCompareValue = itemToCompare[index];
		let itemValue = item[index];
		if (itemValue != itemToCompareValue) {
			result.push({
				'ID': id,
				'INDEX': index,
				'CHANGE': itemValue
			});
		}
	}
	return result;
}


/**
 * Do multiple inserts in database using the DBM const
 * @param {Array<Array>} values 
 * @param {String} table 
 * @param {Array<String>} columns 
 */
async function doMultipleInserts(values, table, columns) {
	if (values.length > 0) {
		for (let index in values) {
			let value = values[index]
			if (typeof value == 'object' || typeof value == 'array' || typeof value == Array) {
				await DBM.insert(table, columns, value);
			} else {
				await DBM.insert(table, columns, values);
				break;
			}
			
		}
	}
}


/**
 * Function to create an Array with the values to do a req insert
 * @param {Object} valueObject 
 * @param {Integer} reqID 
 * @param {Object} reqValuesToIDs 
 * @param {Boolean} hasID 
 * @returns {Array}
 */
function createValuesArrayToDoAnReqInsert(valueObject, reqID, reqValuesToIDs, hasID = false) {
	let response = [];
	if (hasID) {
		if (valueObject.length > 1) {
			valueObject.forEach(element => {
				response.push([
					reqID,
					reqValuesToIDs[element["INDEX"]],
					element["ID"],
					element["CHANGE"]
				]);
			});
		} else {
			valueObject.forEach(element => {
				response = response.concat([
					reqID,
					reqValuesToIDs[element["INDEX"]],
					element["ID"],
					element["CHANGE"]
				]);
			});
		}
	} else {
		if (valueObject.length > 1) {
			valueObject.forEach(element => {
				response.push([
					reqID,
					reqValuesToIDs[element["INDEX"]],
					element["CHANGE"]
				]);
			});
		} else {
			valueObject.forEach(element => {
				response = response.concat([
					reqID,
					reqValuesToIDs[element["INDEX"]],
					element["CHANGE"]
				]);
			});
		}
	}
	return response;
}


/**
 * Endpoint to render the initial page
 * @returns {ejs}
 */
app.get("/", (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.render("../views/index.ejs");
});


/**
 * DESCRIPTION
 * PANGEIA is a data catalog application originally made for Banco Pan
 * This file contains the necessary methods to do a CRUD in all relevant tables of the application
 */

/**
 * INSERT METHODS (C)
 */
/**
 * Endpoint to open the insert-req page
 * @param {Integer} id
 * @returns {ejs}
 */
app.get("/insert-req", async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	let id = req.query.id;
	getTableData(id).then((result) => {
		res.statusCode = 200;
		res.render('pages/insert-req', {
			table: result
		});
	});
});



/**
 * Endpoint to insert the requisition and redirect to the previous page
 * @returns {ejs}
 */
app.post('/insert-req', urlencodedParser, async (req, res) => {
	let body = {};
	for (let index in req.body) {
		let value = req.body[index];
		if (!req.body[index]) {
			value = null;
		}
		body[index] = value;
	}

	let id = body.tableID;

	getTableData(id).then(async (result) => {
		let timeLapsed = Date.now();
		let today = new Date(timeLapsed);

		await DBM.insertReturningTheInsertedDataID('TB_REQUISICAO', 
		['ID_TABELA', 'USUARIO', 'JUSTIFICATIVA', 'ID_STATUS', 'DATA_REQ'], 
		[id, 'teste', body.justify, 1, formatDate(today, 'dd/mm/aaaa')]).then(async (insertedReqid) => {
			let reqID = insertedReqid[0]['last_insert_rowid()'];
			let creationDateBase = String(body.creationDate);
			let year = creationDateBase.slice(0, 4);
			let month = creationDateBase.slice(5, 7);
			let day = creationDateBase.slice(8, 10);
			let creationDate = `${day}/${month}/${year}`;

			let reqFields = [];
			for (let index in body.fieldID) {
				reqFields.push({
					'ID_VARIAVEL': body.fieldID[index] == '' ? null : body.fieldID[index],
					'NOME_CAMPO': body.fieldName[index] == '' ? null : body.fieldName[index],
					'TIPO_CAMPO': body.fieldType[index] == '' ? null : body.fieldType[index],
					'TIPO_PESSOA': body.personType[index] == '' ? null : body.personType[index],
					'DESCRICAO_CAMPO': body.fieldDesc[index] == '' ? null : body.fieldDesc[index],
					'CH_PRIMARIA': body.isPK[index] == '' ? null : body.isPK[index],
					'ACCEPT_NULL': body.acceptNull[index] == '' ? null : body.acceptNull[index],
					'UNQ': body.isUNQ[index] == '' ? null : body.isUNQ[index],
					'VOLATIL': body.volatile[index] == '' ? null : body.volatile[index],
					'LGPD': body.LGPD[index] == '' ? null : body.LGPD[index]
				});
			}
			let reqTable = {
				'CONJUNTODADOS_PRODUTO': body.datasetData,
				'CONTEUDO_TABELA': body.tableDesc,
				'CAMINHO': body.tablePath,
				'DATABASE': body.database,
				'DATA_CRIACAO': creationDate,
				'DEFASAGEM': body.lag,
				'OWNER': body.ownerData,
				'STEWARD': body.stewardData,
				'ENG_INGESTAO': body.engResp,
			}
			let reqConnection = {
				'FREQUENCIA': body.updateFrequency,
				'MECANICA': body.mechanics
			}

			let reqs = {}
			reqs['table'] = compareObjects(reqTable, result);
			if (result['CONEXAO'].length > 0) {
				reqs['connection'] = compareObjects(reqConnection, result['CONEXAO'][0], body.connectionID);
			}

			let tableFields = result['VARIAVEL']
			if (tableFields.length > 0) {
				let fields = [];
				for (let index in reqFields) {
					let fieldReq = reqFields[index];
					for (let i = 0; i < tableFields.length; i++) {
						if (tableFields[i]["ID_VARIAVEL"] == fieldReq["ID_VARIAVEL"]) {
							let result = compareObjects(fieldReq, tableFields[i], fieldReq["ID_VARIAVEL"]);
							fields = fields.concat(result);
							break;
						}
					}
				}
				reqs['fields'] = fields;
			}

			let tableNames = await DBM.select("select * from TB_CAMPO_TABELA");
			let connectionNames = await DBM.select("select * from TB_CAMPO_CONEXAO");
			let fieldNames = await DBM.select("select * from TB_CAMPO_VARIAVEL");

			let reqTableIDs = setArrayValueAsKey(tableNames, 'NOME_CAMPO_TABELA', 'ID_CAMPO_TABELA');
			let reqConnectionIDs = setArrayValueAsKey(connectionNames, 'NOME_CAMPO_CONEXAO', 'ID_CAMPO_CONEXAO');
			let reqFieldIDs = setArrayValueAsKey(fieldNames, 'NOME_CAMPO_VARIAVEL', 'ID_CAMPO_VARIAVEL');

			let reqConnectionValues = createValuesArrayToDoAnReqInsert(reqs['connection'], reqID, reqConnectionIDs, true);
			let reqFieldsValues = createValuesArrayToDoAnReqInsert(reqs['fields'], reqID, reqFieldIDs, true);
			let reqTableValues = createValuesArrayToDoAnReqInsert(reqs['table'], reqID, reqTableIDs, false);

			await doMultipleInserts(reqConnectionValues, 'TB_REQ_CONEXAO', ['ID_REQUISICAO', 'ID_CAMPO_CONEXAO', 'ID_CONEXAO', 'ALTERACAO']);
			await doMultipleInserts(reqTableValues, 'TB_REQ_TABELA', ['ID_REQUISICAO', 'ID_CAMPO_TABELA', 'ALTERACAO']);
			await doMultipleInserts(reqFieldsValues, 'TB_REQ_VARIAVEL', ['ID_REQUISICAO', 'ID_CAMPO_VARIAVEL', 'ID_VARIAVEL', 'ALTERACAO']);

			res.statusCode = 200;
			res.redirect(('/table?id='+id));
		});
	});
});


/**
 * Endpoint to insert new data in TB_TABELA
 * @param {Object} data 
 */
app.post('/insert-tb', urlencodedParser, async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	let data = JSON.parse(req.body.data);

	for (let insert of data) {
		let columns = [
			"ID", "CONJUNTODADOS_PRODUTO", "ID_TABELA", "TABELA", "CONTEUDO_TABELA",
			"CRITICIDADE_TABELA", "DADOS_SENSIVEIS", "DEFASAGEM", "DATABASE", "CAMINHO",
			"SCRIPTS_ALIMENTACAO", "ENG_INGESTAO", "OWNER", "STEWARD", "INDICADORAJUSTENOMENCLATURATABELA",
			"LINK_SOL_ACESSO", "LINK_REPORTAR_ERRO", "RANKING_GOVERNANCA", "QTD_VIZUALIZACAO"
		];

		let values = [
			insert['ID'], insert['CONJUNTODADOS_PRODUTO'], insert['ID_TABELA'], insert['TABELA'],
			insert['CONTEUDO_TABELA'], insert['CRITICIDADE_TABELA'], insert['DADOS_SENSIVEIS'], insert['DEFASAGEM'],
			insert['DATABASE'], insert['CAMINHO'], insert['SCRIPTS_ALIMENTACAO'], insert['ENG_INGESTAO'],
			insert['OWNER'], insert['STEWARD'], insert['INDICADORAJUSTENOMENCLATURATABELA'], insert['LINK_SOL_ACESSO'],
			insert['LINK_REPORTAR_ERRO'], insert['RANKING_GOVERNANCA'], insert['QTD_VIZUALIZACAO']
		];

		await DBM.insert("TB_TABELA", columns, values).then(async (results) => {
			let tbTabelaId = insert['ID'];
			for (let TbConexao of insert["CONEXAO"]) {
				columns = [
					"ID", "CONJUNTODADOS_PRODUTO", "TABELA", "ORDEM_ORIGEM", "TABELA_ORIGEM", "SISTEMA_ORIGEM", "SERVIDOR_ORIGEM",
					"DATABASE_ORIGEM", "SCHEMA_ORIGEM", "TIPO_CONEXAO", "REPOSITORIO", "MECANICA", "FREQUENCIA", "MODO_ESCRITA"
				];

				values = [
					tbTabelaId, insert['CONJUNTODADOS_PRODUTO'], insert['TABELA'], TbConexao['ORDEM_ORIGEM'],
					TbConexao['TABELA_ORIGEM'], TbConexao['SISTEMA_ORIGEM'], TbConexao['SERVIDOR_ORIGEM'], TbConexao['DATABASE_ORIGEM'],
					TbConexao['SCHEMA_ORIGEM'], TbConexao['TIPO_CONEXAO'], TbConexao['REPOSITORIO'], TbConexao['MECANICA'],
					TbConexao['FREQUENCIA'], TbConexao['MODO_ESCRITA']
				];

				await DBM.insert("TB_CONEXAO", columns, values);
			}

			for (let TbVariavel of insert["VARIAVEL"]) {
				columns = [
					"CONJUNTODADOS_PRODUTO", "TABELA", "NOME_CAMPO", "TIPO_CAMPO", "TIPO_PESSOA",
					"DESCRICAO_CAMPO", "VOLATIL", "CH_PRIMARIA", "ACCEPT_NULL", "UNQ", "LGPD"
				];

				values = [
					insert['CONJUNTODADOS_PRODUTO'], tbTabelaId, TbVariavel['NOME_CAMPO'], TbVariavel['TIPO_CAMPO'],
					TbVariavel['TIPO_PESSOA'], TbVariavel['DESCRICAO_CAMPO'], TbVariavel['VOLATIL'],
					TbVariavel['CH_PRIMARIA'], TbVariavel['ACCEPT_NULL'], TbVariavel['UNQ'], TbVariavel['LGPD']
				];

				await DBM.insert("TB_VARIAVEL", columns, values);
			}

			for (let TbClassificacao of insert["CLASSIFICACAO"]) {
				columns = [
					"ID_TABELA", "ID_VALOR_CLASSIFICACAO"
				];

				values = [
					tbTabelaId, TbClassificacao['ID_VALOR_CLASSIFICACAO']
				];

				await DBM.insert("TB_CLASSIFICACAO_TABELA", columns, values);
			}
		});
	}
	res.end();

	/**
	 * This insert receives a JSON that should be in this pattern:
	 * [
	 *		{
	 *			"ID": "database.tabela2",
	 *			"CONJUNTODADOS_PRODUTO": "Engenharia de Dados",
	 *			"ID_TABELA": "AWS.CLOUDTRAIL_AWSLOGS_TEMP",
	 *			"TABELA": "CLOUDTRAIL_AWSLOGS_TEMP",
	 *			"CONTEUDO_TABELA": "Tabela contém log de eventos do ambiente do Data Lake.",
	 *			"CRITICIDADE_TABELA": null,
	 *			"DADOS_SENSIVEIS": null,
	 *			"DEFASAGEM": null,
	 *			"DATABASE": "DB_PAN_DL_CURATED",
	 *			"CAMINHO": "s3://pansegs3bucketcloudtrailprod/awslogs/135628704092/cloudtrail/us-east-1/2022/05/06/",
	 *			"SCRIPTS_ALIMENTACAO": "-",
	 *			"ENG_INGESTAO": "-",
	 *			"OWNER": "Samir Migliani",
	 *			"STEWARD": "Rafael Cordeiro de Araujo",
	 *			"INDICADORAJUSTENOMENCLATURATABELA": "S",
	 *			"LINK_SOL_ACESSO": null,
	 *			"LINK_REPORTAR_ERRO": null,
	 *			"RANKING_GOVERNANCA": null,
	 *			"QTD_VIZUALIZACAO": null,
	 *			"CONEXAO": [{
	 *				"ORDEM_ORIGEM": 1,
	 *				"TABELA_ORIGEM": null,
	 *				"SISTEMA_ORIGEM": null,
	 *				"SERVIDOR_ORIGEM": null,
	 *				"DATABASE_ORIGEM": null,
	 *				"SCHEMA_ORIGEM": null,
	 *				"TIPO_CONEXAO": null,
	 *				"REPOSITORIO": null,
	 *				"MECANICA": null,
	 *				"FREQUENCIA": null,
	 *				"MODO_ESCRITA": null
	 *			}],
	 *			"VARIAVEL": [{
	 *				"NOME_CAMPO": "ALGO",
	 *				"TIPO_CAMPO": "SOMETHING",
	 *				"TIPO_PESSOA": "PJ",
	 *				"DESCRICAO_CAMPO": "SIM",
	 *				"VOLATIL": "N",
	 *				"CH_PRIMARIO": "N",
	 *				"NULL": "N",
	 *				"UNQ": "N",
	 *				"LGPD": "G"
	 *			}],
	 *			"CLASSIFICACAO": [
	 *				{
	 *					"ID_VALOR_CLASSIFICACAO": "TXT"
	 *				}
	 *			]
	 *		}
	 *	]
	 */
});


/**
 * SELECT METHODS (R)
 */

/**
 * Endpoint to search data in TB_TABELA and its children
 * @param {String} q
 * @param {Integer} index
 * @param {Integer} maxRows  
 * @returns {EJS} results.ejs
 */
app.get('/search', async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	let q = req.query.q;
	let db = req.query.db;
	let index = req.query.index;
	let maxRows = req.query.maxRows;

	/**
	 * To the search mecanism works, we split each word in the query (q)
	 */
	let words = q.split(" ");
	words = words.filter((item, index) => words.indexOf(item) === index);
	let values = words.map(word => ("%" + word + "%"));

	/**
	 * For each comparison in the comparison Array have a ...values in valuesArray.
	 */
	let valuesArray = [
		...values, ...values, ...values, ...values, ...values,
		...values, ...values, ...values, ...values, ...values,
		...values, ...values, ...values
	].sort();

	valuesArray = valuesArray.concat(valuesArray);

	let comparisons = words.map(word => (
		[
			" TB_TABELA.CONTEUDO_TABELA like ?",
			" TB_TABELA.DATABASE like ?",
			" TB_TABELA.TABELA like ?",

			" TB_VALOR_CLASSIFICACAO.VALOR_CLASSIFICACAO like ?",
			" TB_CLASSIFICACAO.NOME_CLASSIFICACAO like ? ",

			" TB_OWNER_STEWARD.CONJUNTO_DADOS like ?",
			" TB_OWNER_STEWARD.DATA_STEWARD like ?",
			" TB_OWNER_STEWARD.DATA_OWNER like ?",
			" TB_OWNER_STEWARD.SIGLA_CONJUNTO_DE_DADOS like ?",

			" TB_VARIAVEL.TIPO_CAMPO like ?",
			" TB_VARIAVEL.TIPO_PESSOA like ?",
			" TB_VARIAVEL.NOME_CAMPO like ?",
			" TB_VARIAVEL.DESCRICAO_CAMPO like ?"
		]
	));

	let wheres = comparisons.map(word => word.join(" or ")).join(" or ");

	/**
	 * In the order by array, the first items of the comparison have more weight than last ones.
	 */
	let orderby = comparisons.map((array) => {
		let step = 6;
		let weights = (parseInt(array.length) * step) + step;
		return array.map(phrase => {
			weights = weights - step;
			return (" (CASE WHEN " + phrase + ` collate nocase THEN ${weights.toFixed(0)} ELSE 0 END)`);
		}).join(" + ");
	}).join(" + ");

	let sql = "select TB_TABELA.ID, TB_TABELA.CONTEUDO_TABELA, TB_TABELA.DADOS_SENSIVEIS, TB_TABELA.TABELA, TB_TABELA.DATABASE from TB_TABELA " +
		" LEFT JOIN TB_VARIAVEL ON TB_TABELA.TABELA = TB_VARIAVEL.TABELA " +
		" LEFT JOIN TB_OWNER_STEWARD ON TB_TABELA.CONJUNTODADOS_PRODUTO = TB_OWNER_STEWARD.CONJUNTO_DADOS " +
		" LEFT JOIN TB_CONEXAO ON TB_TABELA.ID = TB_CONEXAO.ID  " +
		" LEFT JOIN TB_CLASSIFICACAO_TABELA ON TB_TABELA.ID = TB_CLASSIFICACAO_TABELA.ID_TABELA " +
		" LEFT JOIN TB_VALOR_CLASSIFICACAO ON TB_CLASSIFICACAO_TABELA.ID_VALOR_CLASSIFICACAO = TB_VALOR_CLASSIFICACAO.ID_VALOR_CLASSIFICACAO  " +
		" LEFT JOIN TB_CLASSIFICACAO ON TB_VALOR_CLASSIFICACAO.ID_CLASSIFICACAO = TB_CLASSIFICACAO.ID_CLASSIFICACAO  " +
		` where (${wheres}) collate nocase ` +
		` group by TB_TABELA.ID_TABELA ` +
		` order by (${orderby}) desc, TB_TABELA.RANKING_GOVERNANCA desc`;

	let sqlWithLimit = sql + ` limit ?, ?;`;

	await DBM.select(sqlWithLimit, valuesArray.concat([index, maxRows])).then(async (result) => {
		let newSql = `select count(*) as 'qtdRows' FROM (${sql}) T;`

		await DBM.select(newSql, valuesArray).then((qtdRows) => {
			index = parseInt(index)
			let qtdConsultRows = parseInt(qtdRows[0]['qtdRows']);
			/**
			 * The next verifications are necessary to show a valid index in frontend;
			 */
			let totalIndex = Math.ceil(parseInt(qtdConsultRows) / parseInt(maxRows));
			if (index > totalIndex) {
				index = totalIndex;
			}
			if (index < 1) {
				index = 1;
			}

			res.statusCode = 200;
			res.render('results', {
				results: result,
				qtdRows: (qtdConsultRows - 1),
				totalIndex: totalIndex,
				index: index,
				query: q,
				maxRows: maxRows
			});
		}).catch((error) => {
			console.log(error);
			res.end();
		});

	}).catch((error) => {
		res.statusCode = 500;
		console.log(error);
		res.end();
	});
});


/**
 * Endpoint to search data in TB_TABELA and its children
 * @param {String} id
 * @returns {JSON}
 */
app.get('/table', async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	let id = req.query.id;
	let db = req.query.db;
	let sql = "select * from TB_TABELA " +
		"inner join TB_OWNER_STEWARD on " +
		"TB_TABELA.CONJUNTODADOS_PRODUTO = TB_OWNER_STEWARD.CONJUNTO_DADOS " +
		"where ID=?";
	await DBM.select(sql, [id]).then(async (result) => {
		let response = result[0];
		let table = response["TABELA"];
		response["CONEXAO"] = await DBM.select("select * from TB_CONEXAO where ID=?", [id]);
		response["VARIAVEL"] = await DBM.select("select * from TB_VARIAVEL where TABELA=?", [table]);
		sql = "select * from TB_CLASSIFICACAO_TABELA where ID_TABELA=?";
		response["CLASSIFICACAO_TABELA"] = await DBM.select(sql, [id]);
		res.render('../views/view-table.ejs', {
			table: response
		});
	});
});


/**
 * Endpoint to show all the requests made by the users.
 * @param {Integer} id
 * @returns {JSON}
 */
app.get('/requests', async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	let sql = "select TB_REQUISICAO.*, TB_TABELA.TABELA  from TB_REQUISICAO" +
		" inner join TB_TABELA on " +
		" TB_REQUISICAO.ID_TABELA = TB_TABELA.ID COLLATE NOCASE" +
		" WHERE TB_REQUISICAO.ID_STATUS = 1;";
	await DBM.select(sql, []).then(async (request) => {
		let response = request;
		res.render("see-all-req.ejs", {
			requisitions: response
		});
	});
});



/**
 * UPDATE METHODS (U)
 */

/**
 * Endpoint to search data in TB_REQUISICAO where ID_REQUISICAO is equal to the id argument
 * @param {Integer} id
 * @returns {JSON}
 */
app.get('/request', async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	let id = req.query.id;
	let sql = "select * from TB_REQUISICAO where ID_REQUISICAO=?";
	await DBM.select(sql, [id]).then(async (request) => {
		let requestData = request[0];
		let id = requestData["ID_REQUISICAO"];

		requestData["CONEXAO"] = await DBM.select("select * from TB_REQ_CONEXAO where ID_REQUISICAO=?", [id]);
		requestData["VARIAVEL"] = await DBM.select("select * from TB_REQ_VARIAVEL where ID_REQUISICAO=?", [id]);
		requestData["TABELA"] = await DBM.select("select * from TB_REQ_TABELA where ID_REQUISICAO=?", [id]);	
		
		let tableData = await getTableData(requestData["ID_TABELA"]);
		let tableFieldData = await DBM.select("select * from TB_CAMPO_TABELA");
		let connectionData = await DBM.select("select * from TB_CAMPO_CONEXAO");
		let fieldData = await DBM.select("select * from TB_CAMPO_VARIAVEL");
		let statusData = await DBM.select("select * from TB_STATUS");

		let reqTableColumns = setArrayValueAsKey(tableFieldData, 'ID_CAMPO_TABELA', 'NOME_CAMPO_TABELA');
		let reqConnectionColumns = setArrayValueAsKey(connectionData, 'ID_CAMPO_CONEXAO', 'NOME_CAMPO_CONEXAO');
		let reqFieldColumns = setArrayValueAsKey(fieldData, 'ID_CAMPO_VARIAVEL', 'NOME_CAMPO_VARIAVEL');
		let reqStatusColumns = setArrayValueAsKey(statusData, 'ID_STATUS', 'NOME_STATUS');

		let status = reqStatusColumns[requestData["ID_STATUS"]];
		let connectionFields = {};
		let tableFields = {};
		let fields = {};

		for (let index in requestData["TABELA"]) {
			let tableField = requestData["TABELA"][index];
			let i = reqTableColumns[tableField["ID_CAMPO_TABELA"]];
			tableFields[i] = {
				"ALTERACAO": tableField["ALTERACAO"], 
				"ORIGINAL": tableData[i]
			}
		}

		for (let index in requestData["CONEXAO"]) {
			let connectionField = requestData["CONEXAO"][index];
			let i = reqConnectionColumns[connectionField["ID_CAMPO_CONEXAO"]];
			connectionFields[i] = {
				"ALTERACAO": connectionField["ALTERACAO"], 
				"ORIGINAL": tableData["CONEXAO"][0][i]
			}
		}

		for (let index in requestData["VARIAVEL"]) {
			let field = requestData["VARIAVEL"][index];
			let i = reqFieldColumns[field["ID_CAMPO_VARIAVEL"]];
			let oldField = await DBM.select("select * from TB_VARIAVEL WHERE ID_VARIAVEL=?", [field["ID_VARIAVEL"]]);
			let objectToContainTheObject = {};
			let object = {
				"ALTERACAO": field["ALTERACAO"], 
				"ORIGINAL": oldField[0][i]
			};
			
			objectToContainTheObject[i] = object;

			if (undefined == fields[field["ID_VARIAVEL"]]) {
				fields[field["ID_VARIAVEL"]] = objectToContainTheObject;
				
				object = {"NOME_VARIAVEL": oldField[0]["NOME_CAMPO"]}

				fields[field["ID_VARIAVEL"]] = Object.assign(fields[field["ID_VARIAVEL"]], object);
				continue;
			}
			fields[field["ID_VARIAVEL"]] = Object.assign(fields[field["ID_VARIAVEL"]], objectToContainTheObject);
		}
		
		let connection = undefined;
		if (requestData["CONEXAO"].length > 0) {
			connection = {
				"ID_CONEXAO": requestData["CONEXAO"][0]["ID_CONEXAO"],
				"CAMPOS": connectionFields
			}
		}

		let response = {
			'ID_TABELA': requestData["ID_TABELA"],
			'ID_REQUISICAO': requestData["ID_REQUISICAO"],
			'USUARIO': requestData["USUARIO"],
			'JUSTIFICATIVA': requestData["JUSTIFICATIVA"],
			"DATA_REQ": requestData["DATA_REQ"],
			"STATUS": status,
			"CAMPOS": tableFields,
			"CONEXAO": connection,
			"VARIAVEL": fields,
		}
		
		res.render("pages/request.ejs", {table: response});
	});
});


/**
 * 
 */
app.post('/request', urlencodedParser, async (req, res) => {
	res.setHeader('Access-Control-Allow-Origin', '*');
	let data = req.body;
	let obj = {ID_STATUS: data.status};
	
	await DBM.update('TB_REQUISICAO', obj, "ID_REQUISICAO=?", [data.reqID]);
	if (data.status == 2) {
		await changeInputNameToDBNameAndUpdate('TB_TABELA', data.table, "ID=?", data.tableID);
		for (let index in data.fields) {
			let field = data.fields[index];
			await changeInputNameToDBNameAndUpdate('TB_VARIAVEL', field, "ID_VARIAVEL=?", index);
		}
	}
	res.json({'error': false});
});


/**
 * DELETE METHODS (D)
 */

/**
 * Endpoint to delete data in TB_TABELA
 * @param {String} id
 */
app.post('/remove-table', urlencodedParser, async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	let id = req.body.id;
	await DBM.delete("TB_TABELA", "ID=?", [id]).then(async () => {
		await DBM.delete("TB_CONEXAO", "ID=?", [id]);
		await DBM.delete("TB_VARIAVEL", "TABELA=?", [id]);
		await DBM.delete("TB_CLASSIFICACAO_TABELA", "ID_TABELA=?", [id]);
	});
	res.end();
});


/**
 * Endpoint to delete data in TB_CONEXAO
 * @param {Integer} id
 */
app.post('/remove-connection', urlencodedParser, async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	let id = req.body.id;
	await DBM.delete("TB_CONEXAO", "ID_CONEXAO=?", [id]);
	res.end();
});


/**
 * Endpoint to delete data in TB_VARIAVEL
 * @param {Integer} id
 */
app.post('/remove-variable', urlencodedParser, async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	let id = req.body.id;
	await DBM.delete("TB_VARIAVEL", "ID_VARIAVEL=?", [id]);
	res.end();
});


/**
 * Endpoint to delete data in TB_CLASSIFICACAO_TABELA
 * @param {Integer} id
 */
app.post('/remove-classification', urlencodedParser, async (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	let id = req.body.id;
	await DBM.delete("TB_CLASSIFICACAO_TABELA", "ID_CLASSIFICACAO_TABELA=?", [id]);
	res.end();
});

app.post("/delet-req", urlencodedParser, async (req, res)=>{
	res.statusCode = 200;
	let id = req.body.id;
	res.setHeader("Access-Control-Allow-Origin", "*");
	let error = {"error": false};
	await DBM.delete("TB_REQUISICAO", "ID_REQUISICAO=?", [id]).catch(() => {
		error["error"] = true;
	});
	await DBM.delete("TB_REQ_VARIALVEL", "ID_REQUISICAO=?", [id]).catch(() => {
		error["error"] = true;
	});
	await DBM.delete("TB_REQ_TABELA", "ID_REQUISICAO=?", [id]).catch(() => {
		error["error"] = true;
	});
	await DBM.delete("TB_REQ_CONEXAO", "ID_REQUISICAO=?", [id]).catch(() => {
		error["error"] = true;
	});
	res.json(error);
	
});

app.get("/loading", (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.render("../views/partials/loading.ejs");
});


/**
 * Function to render 404 page
 * @returns {ejs}
 */
app.get("*", (req, res) => {
	res.statusCode = 200;
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.render("../views/not_found.ejs");
});



/**
 * Running the Application
 */
app.listen(port, hostname, () => {
	console.log(`Server running at http://${hostname}:${port}/`);
});
