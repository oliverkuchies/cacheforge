"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateJSONData = generateJSONData;
const faker_1 = require("@faker-js/faker");
async function generateJSONData(cacheLevel, recordNum) {
    for (let i = 0; i < recordNum; i++) {
        const randomTTL = Math.floor(Math.random() * 3600) + 1;
        await cacheLevel.set(`key${i}`, {
            name: faker_1.faker.person.firstName(),
            age: faker_1.faker.number.int({ min: 1, max: 100 }),
            address: {
                street: faker_1.faker.location.streetAddress(),
                city: faker_1.faker.location.city(),
                zip: faker_1.faker.location.zipCode(),
            },
            hobbies: faker_1.faker.helpers.arrayElements(["reading", "gaming", "hiking", "coding", "cooking"], 3),
        }, randomTTL);
    }
}
//# sourceMappingURL=data.utilities.js.map