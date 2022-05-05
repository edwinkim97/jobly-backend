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

  static async create({ title, salary, equity, companyHandle }) {
    if (Number(equity) >= 1) {
      throw new BadRequestError();
    }
    if (Number(salary) < 0) {
      throw new BadRequestError();
    }
    const existsCheck = await db.query(
      `SELECT handle
           FROM companies
           WHERE handle = $1`,
      [companyHandle]);
    if (existsCheck.rows.length === 0)
      throw new BadRequestError(`Company does not exist: ${companyHandle}`);


    const result = await db.query(
      `INSERT INTO jobs(
          title,
          salary,
          equity,
          company_handle)
           VALUES
             ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
      [title, salary, equity, companyHandle]);
    const job = result.rows[0];

    return job;
  }


  /** Create WHERE clause for filters, to be used by functions that query
 * with filters.
 *
 * searchFilters (all optional):
 * - minSalary
 * - hasEquity
 * - title (will find case-insensitive, partial matches)
 *
 * Returns {
 *  where: "WHERE minSalary >= $1 AND title ILIKE $2",
 *  vals: [10000, '%Engineer%']
 * }
 */

  static _filterWhereBuilder({ minSalary, hasEquity, title }) {
    let whereParts = [];
    let vals = [];

    if (minSalary !== undefined) {
      vals.push(minSalary);
      whereParts.push(`salary >= $${vals.length}`);
    }

    if (hasEquity === true) {
      whereParts.push(`equity > 0`);
    }

    if (title !== undefined) {
      vals.push(`%${title}%`);
      whereParts.push(`title ILIKE $${vals.length}`);
    }

    const where = (whereParts.length > 0) ?
      "WHERE " + whereParts.join(" AND ")
      : "";

    return { where, vals };
  }

  /** Find all jobs (optional filter on searchFilters).
   *
   * searchFilters (all optional):
   * - minSalary
   * - hasEquity (true returns only jobs with equity > 0, other values ignored)
   * - title (will find case-insensitive, partial matches)
   *
   * Returns [{ id, title, salary, equity, companyHandle, companyName }, ...]
   * */

  static async findAll({ minSalary, hasEquity, title } = {}) {

    const { where, vals } = this._filterWhereBuilder({
      minSalary, hasEquity, title,
    });

    const jobsRes = await db.query(
      `SELECT j.id,
                j.title,
                j.salary,
                j.equity,
                j.company_handle AS "companyHandle",
                c.name AS "companyName"
          FROM jobs j
          LEFT JOIN companies AS c ON c.handle = j.company_handle
      ${where}`, vals);

    return jobsRes.rows;
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

  /** Given a job id, return data about job.
 *
 * Returns { id, title, salary, equity, companyHandle, company }
 *   where company is { handle, name, description, numEmployees, logoUrl }
 *
 * Throws NotFoundError if not found.
 **/

  static async get(id) {
    const jobRes = await db.query(
      `SELECT id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"
             FROM jobs
             WHERE id = $1`, [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    const companiesRes = await db.query(
      `SELECT handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"
             FROM companies
             WHERE handle = $1`, [job.companyHandle]);

    delete job.companyHandle;
    job.company = companiesRes.rows[0];

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include: { title, salary, equity }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {});
    const idVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs
                        SET ${setCols}
                        WHERE id = ${idVarIdx}
                        RETURNING id,
                                  title,
                                  salary,
                                  equity,
                                  company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(id) {
    const result = await db.query(
      `DELETE
             FROM jobs
             WHERE id = $1
             RETURNING id`, [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;
