"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * Throws BadRequestError if job already in database.
   * */

  static async create({ title, salary, equity, company_handle }) {

    const result = await db.query(
      `INSERT INTO companies(
          handle,
          name,
          description,
          num_employees,
          logo_url)
           VALUES
             ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
      [
        handle,
        name,
        description,
        numEmployees,
        logoUrl,
      ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies
   * Arguments (Optional): 
   *  filterArgs = {name: NameToFilterOn, 
   *                minEmployees: num_Employees minimum to filter on,
   *                maxEmployees: num_Employees maximum to filter on}
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */
  static async findAll(filterArgs = {}) {
    const { whereClause, values } = Company._sqlForCompanyFilter(filterArgs);

    const companiesRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           ${whereClause}
           ORDER BY name`, values);

    return companiesRes.rows;
  }

  /** Helper for Company.FindAll() optional filtering functionality
   * Arguments (Optional): 
   *  filterArgs = {name: NameToFilterOn, 
   *                minEmployees: num_Employees minimum to filter on,
   *                maxEmployees: num_Employees maximum to filter on}
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
  static _sqlForCompanyFilter({ minEmployees, maxEmployees, name }) {
    if (Number(minEmployees) > Number(maxEmployees)) {
      throw new BadRequestError("minEmployees must be greater than maxEmployees");
    }
    const values = [];
    const whereConditions = [];
    if (name !== undefined) {
      values.push(`%${name}%`);
      whereConditions.push(`name ILIKE $${values.length}`);
    }
    if (minEmployees !== undefined) {
      values.push(minEmployees);
      whereConditions.push(`num_employees>=$${values.length}`);
    }
    if (maxEmployees !== undefined) {
      values.push(maxEmployees);
      whereConditions.push(`num_employees<=$${values.length}`);
    }

    const whereClause = whereConditions.length === 0 ?
      "" :
      "WHERE " + whereConditions.join(" AND ");

    return { whereClause, values };
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
      `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
      [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE companies
      SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
      `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
      [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Job;
