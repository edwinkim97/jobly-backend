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
      .post("/jobs")
      .send({
        id: 23333,
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
            equity: "0.1",
            companyHandle: "c1"
          },
          {
            id: expect.any(Number),
            title: "j2",
            salary: 2,
            equity: "0.2",
            companyHandle: "c2"
          },
          {
            id: expect.any(Number),
            title: "j3",
            salary: 3,
            equity: "0.3",
            companyHandle: "c3"
          },
        ],
    });
  });
  // TODO: COME BACK FOR FILTERING
  // test("works: filter", async function () {
  //   const filterArgs = { name: "Company 1", minEmployees: 1, maxEmployees: 1 };
  //   const resp = await request(app).get("/jobs").query(filterArgs);
  //   expect(resp.body).toEqual({
  //     jobs:
  //       [
  //         {
  //           handle: "c1",
  //           name: "Company 1",
  //           description: "Desc1",
  //           numEmployees: 1,
  //           logoUrl: "http://c1.img",
  //         }
  //       ]
  //   });
  // });

  // test("fails: filter wrong type", async function () {
  //   const filterArgs = { name: 1, minEmployees: "5", maxEmployees: "Ten" };
  //   const resp = await request(app).get("/jobs").query(filterArgs);
  //   expect(resp.statusCode).toEqual(400);
  // });

  // test("fails: minEmployees > maxEmployees", async function () {
  //   const filterArgs = { minEmployees: 5, maxEmployees: 3 };
  //   const resp = await request(app).get("/jobs").query(filterArgs);
  //   expect(resp.statusCode).toEqual(400);
  // })

  // test("fails: invalid filter arguments", async function () {
  //   const filterArgs = { handle: "c1" };
  //   const resp = await request(app).get("/jobs").query(filterArgs);
  //   expect(resp.statusCode).toEqual(400);
  // })

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
      .get("/jobs")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const jobId = (await db.query(`SELECT id FROM jobs 
                              WHERE title = 'j1'`)).rows[0].id;
    const resp = await request(app).get(`/jobs/${jobId}`);
    expect(resp.body).toEqual({
      job: {
        id: jobId,
        title: "j1",
        salary: 1,
        equity: "0.1",
        companyHandle: "c1"
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/-999`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:handle */

describe("PATCH /jobs/:handle", function () {
  test("works for admins", async function () {
    const job = (await db.query(`SELECT id, title, salary, equity, 
                                    company_handle AS "companyHandle" FROM jobs 
                                  WHERE title = 'j1'`)).rows[0];
    const resp = await request(app)
      .patch(`/jobs/${job.id}`)
      .send({
        title: "j1-new",
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.body).toEqual({
      job: job,
    });
  });

  test("unauth for anon", async function () {
    const jobId = (await db.query(`SELECT id FROM jobs 
                              WHERE title = 'j1'`)).rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        name: "j1-new",
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non-admin user", async function () {
    const jobId = (await db.query(`SELECT id FROM jobs 
                              WHERE title = 'j1'`)).rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        name: "j1-new",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  })

  test("not found on no such job", async function () {
    const resp = await request(app)
      .patch(`/jobs/-999`)
      .send({
        title: "no such job",
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on handle change attempt", async function () {
    const jobId = (await db.query(`SELECT id FROM jobs 
                              WHERE title = 'j1'`)).rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        handle: "j1-new",
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const jobId = (await db.query(`SELECT id FROM jobs 
                              WHERE title = 'j1'`)).rows[0].id;
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        id: 999,
        companyHandle: "c2",
      })
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(400);
    expect(resp.body.message.length).toEqual(2);
  });
});

/************************************** DELETE /jobs/:handle */

describe("DELETE /jobs/:handle", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .delete(`/jobs/c1`)
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.body).toEqual({ deleted: "c1" });
  });

  test("unauth for non-admins", async function () {
    const resp = await request(app)
      .delete(`/jobs/c1`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/jobs/c1`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such job", async function () {
    const resp = await request(app)
      .delete(`/jobs/nope`)
      .set("authorization", `Bearer ${admin1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
