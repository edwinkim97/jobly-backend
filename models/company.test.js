"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
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
  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    const company = await Company.create(newCompany);
    expect(company).toEqual(newCompany);

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'new'`);
    expect(result.rows).toEqual([
      {
        handle: "new",
        name: "New",
        description: "New Description",
        num_employees: 1,
        logo_url: "http://new.img",
      },
    ]);
  });

  test("bad request with dupe", async function () {
    try {
      await Company.create(newCompany);
      await Company.create(newCompany);
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
    const companies = await Company.findAll();
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "Company 1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "Company 2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
      {
        handle: "c3",
        name: "Company 22",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      },
    ]);
  });
  test("works: filter name (Case sensitive) ", async function () {
    const companies = await Company.findAll({ name: "Company 1" });
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "Company 1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      }]);
  });
  test("works: filter name (Case insensitive) ", async function () {
    const companies = await Company.findAll({ name: "company 1" });
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "Company 1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      }]);
  });
  test("works: filter name substring", async function () {
    const companies = await Company.findAll({ name: "any 1" });
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "Company 1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      }]);
  });
  test("works: filter name doesn't exist should be empty", async function () {
    const companies = await Company.findAll({ name: "DOES NOT MATCH" });
    expect(companies).toEqual([]);
  });
  test("works: filter minEmployees", async function () {
    const companies = await Company.findAll({ minEmployees: 2 });
    expect(companies).toEqual([
      {
        handle: "c2",
        name: "Company 2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      }, {
        handle: "c3",
        name: "Company 22",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      }]);
  });
  test("works: filter minEmployees large number should be empty", async function () {
    const companies = await Company.findAll({ minEmployees: 999999 });
    expect(companies).toEqual([]);
  });
  test("works: filter maxEmployees", async function () {
    const companies = await Company.findAll({ maxEmployees: 2 });
    expect(companies).toEqual([
      {
        handle: "c1",
        name: "Company 1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
      {
        handle: "c2",
        name: "Company 2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      }]);
  });
  test("works: filter maxEmployees small number should be empty", async function () {
    const companies = await Company.findAll({ maxEmployees: 0 });
    expect(companies).toEqual([]);
  });
  test("works: filter with same minEmployees and maxEmployees", async function () {
    const companies = await Company.findAll({ minEmployees: 2, maxEmployees: 2 });
    expect(companies).toEqual([
      {
        handle: "c2",
        name: "Company 2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      }]);
  });
  test("works: filter with name, minEmployees, maxEmployees", async function () {
    const companies = await Company.findAll({ name: "2", minEmployees: 3, maxEmployees: 3 });
    expect(companies).toEqual([
      {
        handle: "c3",
        name: "Company 22",
        description: "Desc3",
        numEmployees: 3,
        logoUrl: "http://c3.img",
      }]);
  });
});

/************************************** _sqlForCompanyFilter */

describe("sqlForCompanyFilter", function () {
  test("works properly", function () {
    const filterArgs = { name: "Company 1", minEmployees: 2, description: "" };
    const { whereClause, values } = Company._sqlForCompanyFilter(filterArgs);

    expect(whereClause).toEqual(
      "WHERE name ILIKE $1 AND num_employees>=$2");
    expect(values).toEqual(["%Company 1%", 2]);
  });

  test("no data", function () {
    const filterArgs = {};
    const { whereClause, values } = Company._sqlForCompanyFilter(filterArgs);

    expect(whereClause).toEqual("");
    expect(values).toEqual([]);
  });

  test("fails minEmployees greater than maxEmployees", function () {
    const filterArgs = { minEmployees: "23", maxEmployees: "2" };
    try {
      Company._sqlForCompanyFilter(filterArgs);
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy()
    }
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const company = await Company.get("c1");
    expect(company).toEqual({
      handle: "c1",
      name: "Company 1",
      description: "Desc1",
      numEmployees: 1,
      logoUrl: "http://c1.img",
    });
  });

  test("not found if no such company", async function () {
    try {
      await Company.get("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    name: "New",
    description: "New Description",
    numEmployees: 10,
    logoUrl: "http://new.img",
  };

  test("works", async function () {
    const company = await Company.update("c1", updateData);
    expect(company).toEqual({
      handle: "c1",
      ...updateData,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: 10,
      logo_url: "http://new.img",
    }]);
  });

  test("works: null fields", async function () {
    const updateDataSetNulls = {
      name: "New",
      description: "New Description",
      numEmployees: null,
      logoUrl: null,
    };

    const company = await Company.update("c1", updateDataSetNulls);
    expect(company).toEqual({
      handle: "c1",
      ...updateDataSetNulls,
    });

    const result = await db.query(
      `SELECT handle, name, description, num_employees, logo_url
           FROM companies
           WHERE handle = 'c1'`);
    expect(result.rows).toEqual([{
      handle: "c1",
      name: "New",
      description: "New Description",
      num_employees: null,
      logo_url: null,
    }]);
  });

  test("not found if no such company", async function () {
    try {
      await Company.update("nope", updateData);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });

  test("bad request with no data", async function () {
    try {
      await Company.update("c1", {});
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** remove */

describe("remove", function () {
  test("works", async function () {
    await Company.remove("c1");
    const res = await db.query(
      "SELECT handle FROM companies WHERE handle='c1'");
    expect(res.rows.length).toEqual(0);
  });

  test("not found if no such company", async function () {
    try {
      await Company.remove("nope");
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});
