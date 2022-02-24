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
 * Throws BadRequestError when dataToUpdate is empty.
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

/** Helper for Company.FindAll() optional filtering functionality
 * Arguments (Optional): 
 *  filterArgs = {name: NameToFilterOn, 
 *                minEmployees: num_Employees minimum to filter on,
 *                maxEmployess: num_Employees maximum to filter on}
 * 
 * Returns:
 *    whereClause: 
 *          String for WHERE conditions which is to be supplied to SQL query
 *    values:
 *          Array of values to be used for the prepared statement.
 * 
 * Example:
 *    > sqlForCompanyFilter({name: "Company 1", minEmployees: 2})
 *    { whereClause: "WHERE name ILIKE $1 and num_employees>=$2",
 *      values: ["%Company 1%", 2] }
 */

function sqlForCompanyFilter({ minEmployees, maxEmployees, name, ...otherArgs }) {
  const values = [];
  const whereConditions = [];
  if (name !== undefined) {
    values.push(`%${name}%`);
    whereConditions.push(`name ILIKE $${whereConditions.length + 1}`);
  }
  if (minEmployees !== undefined) {
    values.push(minEmployees);
    whereConditions.push(`num_employees>=$${whereConditions.length + 1}`);
  }
  if (maxEmployees !== undefined) {
    values.push(maxEmployees);
    whereConditions.push(`num_employees<=$${whereConditions.length + 1}`);
  }
  for (const [arg, val] of Object.entries(otherArgs)) {
    values.push(val);
    whereConditions.push(`${arg}=$${whereConditions.length + 1}`);
  }

  let whereClause;
  if (whereConditions.length === 0) {
    whereClause = "";
  } else {
    whereClause = "WHERE " + whereConditions.join(" AND ");
  };

  return { whereClause, values };
}


module.exports = { sqlForPartialUpdate, sqlForCompanyFilter };
