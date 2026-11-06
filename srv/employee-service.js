const cds = require('@sap/cds');

module.exports = cds.service.impl(async (service) => {
    const db = await cds.connect.to('db');
    const { Employees, Departments } = service.entities;

    service.before(['CREATE', 'UPDATE'], Employees, async (req) => {
        const { hireDate, dateOfBirth, manager_ID } = req.data;
        const today = new Date().toISOString().slice(0, 10);

        if (hireDate && hireDate > today) req.error(400, 'Hire date cannot be in the future', 'hireDate');
        if (dateOfBirth && dateOfBirth >= today) req.error(400, 'Date of birth must be in the past', 'dateOfBirth');
        if (dateOfBirth && hireDate && dateOfBirth >= hireDate) req.error(400, 'Hire date must be after date of birth', 'hireDate');

        const id = req.data.ID ?? req.params?.[0]?.ID ?? req.params?.[0];
        if (manager_ID && id && manager_ID === id) req.error(400, 'An employee cannot be their own manager', 'manager_ID');

        for (const field of ['employeeCode', 'email']) {
            if (!req.data[field]) continue;
            const query = SELECT.one.from(Employees).columns('ID').where({ [field]: req.data[field] });
            if (id) query.where({ ID: { '!=': id } });
            if (await db.run(query)) req.error(409, `An employee with this ${field} already exists`, field);
        }
    });

    service.before('DELETE', Employees, async (req) => {
        const { ID } = req.params[0];
        const reports = await db.run(SELECT.one.from(Employees).columns('ID').where({ manager_ID: ID }));
        if (reports) req.reject(409, 'Cannot delete an employee who is the manager of other employees');
    });

    service.before('DELETE', Departments, async (req) => {
        const { ID } = req.params[0];
        const member = await db.run(SELECT.one.from(Employees).columns('ID').where({ department_ID: ID }));
        if (member) req.reject(409, 'Cannot delete a department that still has employees');
    });
});
