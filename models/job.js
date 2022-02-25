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

  /** Find all jobs
   * Arguments (Optional): 
   *  filterArgs = {}
   *
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */
  static async findAll() {
    //const { whereClause, values } = Company._sqlForCompanyFilter(filterArgs);

    const jobsRes = await db.query(
      `SELECT id,
                title,
                salary,
                equity,
                company_handle AS "companyHandle"
           FROM jobs
           ORDER BY id`);

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

  /** Given a job ID, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle }
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
           WHERE id = $1`,
      [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const jobIdIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE jobs
      SET ${setCols}
        WHERE id = ${jobIdIdx}
        RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No job: ${id}`);

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
