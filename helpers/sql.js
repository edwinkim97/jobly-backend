const { BadRequestError } = require("../expressError");

/** Helper for preparing data for SQL UPDATE statement.
 * Arguments: 
 *    dataToUpdate:
 *      Object of model fields and values to update.
 *    jsToSql:
 *      Object of mappings of model field names to database column names.
 * Returns:
 *    setCols:
 *      String of database column names which is to be supplied for SET command.
 *    values:
 *      Array of values to be used for the prepared statement.
 * 
 * Example:
 *    > sqlForPartialUpdate(
 *        {name: "newName", numEmployees: 0}, 
 *        {numEmployees: "num_employees"}
 *      )
 *    {setCols: '"name"=$1, "num_employees"=$2', values: ["newName", 0]}
 */

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
