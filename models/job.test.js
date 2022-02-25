"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "Unique Job",
    salary: 1,
    equity: 0.05,
    company_handle: "c1",
  };

  test("works", async function () {
    const job = await Job.create(newJob);
    const jobId = job.id;
    expect(job).toEqual({ id: jobId, ...newJob });

    const result = await db.query(
      `SELECT title, salary, equity, company_handle,
             FROM jobs
             WHERE id = ${jobId}`);
    expect(result.rows).toEqual([job]);
  });

  test("bad request with negative salary", async function () {
    const badJob = { ...newJob };
    badJob.salary = -1;
    try {
      await Job.create(badJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("bad request with equity greater than 1", async function () {
    const badJob = { ...newJob };
    badJob.equity = 2;
    try {
      await Job.create(badJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });

  test("bad request with invalid company", async function () {
    const badJob = { ...newJob };
    badJob.company_handle = "NOT A REAL COMPANY";
    try {
      await Job.create(badJob);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** findAll */
// USE const instead of let
describe("findAll", function () {
  test("works: no filter", async function () {
    const jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: 1,
        title: 'computer programmer',
        salary: 200000,
        equity: 0,
        company_handle: "c1"
      },
      {
        id: 2,
        title: 'mechanical engineer',
        salary: 100000,
        equity: 0.3,
        company_handle: "c2"
      },
      {
        id: 3,
        title: 'musician',
        salary: null,
        equity: null,
        company_handle: "c2"
      },
    ]);
  });
});

/************************************** _sqlForCompanyFilter */

// describe("sqlForCompanyFilter", function () {
//   test("works properly", function () {
//     const filterArgs = { name: "Company 1", minEmployees: 2, description: "" };
//     const { whereClause, values } = Company._sqlForCompanyFilter(filterArgs);

//     expect(whereClause).toEqual(
//       "WHERE name ILIKE $1 AND num_employees>=$2");
//     expect(values).toEqual(["%Company 1%", 2]);
//   });

//   test("no data", function () {
//     const filterArgs = {};
//     const { whereClause, values } = Company._sqlForCompanyFilter(filterArgs);

//     expect(whereClause).toEqual("");
//     expect(values).toEqual([]);
//   });

//   test("fails minEmployees greater than maxEmployees", function () {
//     const filterArgs = { minEmployees: "23", maxEmployees: "2" };
//     try {
//       Company._sqlForCompanyFilter(filterArgs);
//       fail();
//     } catch (err) {
//       expect(err instanceof BadRequestError).toBeTruthy()
//     }
//   });
// });

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const job = await job.get(1);
    expect(job).toEqual({
      id: 1,
      title: 'computer programmer',
      salary: 200000,
      equity: 0,
      company_handle: "c1"
    });
  });

  test("not found if no such company", async function () {
    try {
      await Job.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title: "NewJob",
    salary: 999,
    equity: .1,
  };

  test("works", async function () {
    const job = await Job.update(1, updateData);
    expect(job).toEqual({
      id: 1,
      ...updateData,
      company_handle: "c1",
    });

    const result = await db.query(
      `SELECT title, salary, equity
             FROM jobs
             WHERE id = 1`);
    expect(result.rows).toEqual([updateData]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      title: "NewJob",
      salary: null,
      equity: null,
    };

    const job = await Job.update("1", updateDataSetNulls);
    expect(job).toEqual({
      id: 1,
      ...updateDataSetNulls,
      company_handle: "c1",
    });

    const result = await db.query(
      `SELECT title, salary, equity
             FROM jobs
             WHERE id = 1`);
    expect(result.rows).toEqual([updateDataSetNulls]);
  });

  test("not found if no such job", async function () {
    try {
      await Job.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Job.update(1, {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Job.remove(1);
    const res = await db.query(
      "SELECT id FROM jobs WHERE id=1");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such job", async function () {
    try {
      await Job.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
