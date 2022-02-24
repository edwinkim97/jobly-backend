"use strict";

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate, sqlForCompanyFilter } = require("./sql")

describe("sqlForPartialUpdate", function () {
    test("works properly", function () {
        const dataToUpdate = { "firstName": "Edwin", "lastName": "Kim", "email": "test@test.com" };
        const jsToSql = { "firstName": "first_name", "lastName": "last_name", "isAdmin": "is_admin" };

        const { setCols, values } = sqlForPartialUpdate(dataToUpdate, jsToSql);

        expect(setCols).toEqual('"first_name"=$1, "last_name"=$2, "email"=$3');
        expect(values).toEqual(["Edwin", "Kim", "test@test.com"]);
    });

    test("no data", function () {
        const dataToUpdate = {};
        const jsToSql = { "firstName": "first_name", "lastName": "last_name", "isAdmin": "is_admin" };

        try {
            sqlForPartialUpdate(dataToUpdate, jsToSql);
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        };
    });
});

describe("sqlForCompanyFilter", function () {
    test("works properly", function () {
        const filterArgs = { name: "Company 1", minEmployees: 2, description: "" };
        const { whereClause, values } = sqlForCompanyFilter(filterArgs);

        expect(whereClause).toEqual(
            "WHERE name ILIKE $1 AND num_employees>=$2 AND description=$3");
        expect(values).toEqual(["%Company 1%", 2, ""]);
    });

    test("no data", function () {
        const filterArgs = {};
        const { whereClause, values } = sqlForCompanyFilter(filterArgs);

        expect(whereClause).toEqual("");
        expect(values).toEqual([]);
    });
});