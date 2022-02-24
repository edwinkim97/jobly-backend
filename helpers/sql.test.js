"use strict";

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql")

describe("sqlForPartialUpdate", function () {
    test("works properly", function () {
        const dataToUpdate = {"firstName" : "Edwin", "lastName" : "Kim", "email": "test@test.com"};
        const jsToSql = {"firstName" : "first_name", "lastName" : "last_name", "isAdmin": "is_admin"};

        const { setCols, values } = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(setCols).toEqual('"first_name"=$1, "last_name"=$2, "email"=$3');
        expect(values).toEqual(["Edwin", "Kim", "test@test.com"]);
    });

    test("no data", function () {
        const dataToUpdate = {};
        const jsToSql = {"firstName" : "first_name", "lastName" : "last_name", "isAdmin": "is_admin"};

        try {
            sqlForPartialUpdate(dataToUpdate, jsToSql);
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        };
    });
});