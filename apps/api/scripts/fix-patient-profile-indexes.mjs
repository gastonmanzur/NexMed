import 'dotenv/config';
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI is required. Example: MONGO_URI="mongodb://..." node apps/api/scripts/fix-patient-profile-indexes.mjs');
  process.exit(1);
}

const userIdPartialIndexName = 'userId_1_partial_unique';
const organizationPhonePartialIndexName = 'organizationId_1_normalizedPhone_1_partial_unique';

const sameKey = (index, expectedKey) => JSON.stringify(index.key) === JSON.stringify(expectedKey);
const isLegacyBlockingUserIdIndex = (index) => (
  index.name === 'userId_1'
  && index.unique === true
  && sameKey(index, { userId: 1 })
  && !index.partialFilterExpression
);
const isConflictingOrganizationPhoneIndex = (index) => (
  sameKey(index, { organizationId: 1, normalizedPhone: 1 })
  && index.name !== organizationPhonePartialIndexName
);

await mongoose.connect(mongoUri, { autoIndex: false });

try {
  const collection = mongoose.connection.db.collection('patientprofiles');
  const before = await collection.indexes();
  console.log('Existing patientprofiles indexes before migration:');
  console.log(JSON.stringify(before, null, 2));

  for (const index of before) {
    if (isLegacyBlockingUserIdIndex(index) || isConflictingOrganizationPhoneIndex(index)) {
      console.log(`Dropping index ${index.name}`);
      await collection.dropIndex(index.name);
    }
  }

  console.log(`Creating ${userIdPartialIndexName}`);
  await collection.createIndex(
    { userId: 1 },
    {
      unique: true,
      name: userIdPartialIndexName,
      partialFilterExpression: { userId: { $type: 'objectId' } }
    }
  );

  console.log(`Creating ${organizationPhonePartialIndexName}`);
  await collection.createIndex(
    { organizationId: 1, normalizedPhone: 1 },
    {
      unique: true,
      name: organizationPhonePartialIndexName,
      partialFilterExpression: { organizationId: { $type: 'objectId' }, normalizedPhone: { $type: 'string' } }
    }
  );

  const after = await collection.indexes();
  console.log('Existing patientprofiles indexes after migration:');
  console.log(JSON.stringify(after, null, 2));
} finally {
  await mongoose.disconnect();
}
