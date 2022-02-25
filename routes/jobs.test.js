"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  admin1Token,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "new",
    salary: 5,
    equity: "0.5",
    companyHandle: "c1"
  };

  test("works for admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job: newJob,
    });
  });

  test("fail for non-admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("fail for not logged in", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "new",
        salary: 10,
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/companies")
      .send({
        id : 23333,
        ...newJob,
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("works for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
        [
          {
            id: expect.any(Number),
            title: "j1",
            salary: 1,
            equity: ".1",
            companyHandle: "c1"
          },
          {
            id: expect.any(Number),
            title: "j2",
            salary: 2,
            equity: ".2",
            companyHandle: "c2"
          },
          {
            id: expect.any(Number),
            title: "j3",
            salary: 3,
            equity: ".3",
            companyHandle: "c3"
          },
        ],
    });
  });
  // TODO: COME BACK FOR FILTERING
  test("works: filter", async function () {
    const filterArgs = { name: "Company 1", minEmployees: 1, maxEmployees: 1 };
    const resp = await request(app).get("/companies").query(filterArgs);
    expect(resp.body).toEqual({
      companies:
        [
          {
            handle: "c1",
            name: "Company 1",
            description: "Desc1",
            numEmployees: 1,
            logoUrl: "http://c1.img",
          }
        ]
    });
  });
  test("fails: filter wrong type", async function () {
    const filterArgs = { name: 1, minEmployees: "5", maxEmployees: "Ten" };
    const resp = await request(app).get("/companies").query(filterArgs);
    expect(resp.statusCode).toEqual(400);
  });
  test("fails: minEmployees > maxEmployees", async function () {
    const filterArgs = { minEmployees: 5, maxEmployees: 3 };
    const resp = await request(app).get("/companies").query(filterArgs);
    expect(resp.statusCode).toEqual(400);
  })
  test("fails: invalid filter arguments", async function () {
    const filterArgs = { handle: "c1" };
    const resp = await request(app).get("/companies").query(filterArgs);
    expect(resp.statusCode).toEqual(400);
  })
});

test("fails: test next() handler", async function () {
  // there's no normal failure event which will cause this route to fail ---
  // thus making it hard to test that the error-handler works with it. This
  // should cause an error, all right :)
  await db.query("DROP TABLE companies CASCADE");
  const resp = await request(app)
    .get("/companies")
    .set("authorization", `Bearer ${u1Token}`);
  expect(resp.statusCode).toEqual(500);
});

/************************************** GET /companies/:handle */

describe("GET /companies/:handle", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/companies/c1`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "Company 1",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("works for anon: company w/o jobs", async function () {
    const resp = await request(app).get(`/companies/c2`);
    expect(resp.body).toEqual({
      company: {
        handle: "c2",
        name: "Company 2",
        description: "Desc2",
        numEmployees: 2,
        logoUrl: "http://c2.img",
      },
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/companies/nope`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /companies/:handle */

describe("PATCH /companies/:handle", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.body).toEqual({
      company: {
        handle: "c1",
        name: "C1-new",
        description: "Desc1",
        numEmployees: 1,
        logoUrl: "http://c1.img",
      },
    });
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non-admin user", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        name: "C1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  })

  test("not found on no such company", async function () {
    const resp = await request(app)
      .patch(`/companies/nope`)
      .send({
        name: "new nope",
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        handle: "c1-new",
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/companies/c1`)
      .send({
        logoUrl: "not-a-url",
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /companies/:handle */

describe("DELETE /companies/:handle", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for non-admins", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/companies/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/companies/nope`)
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
