import 'dotenv/config';
import mongoose from 'mongoose';

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('MONGO_URI is required. Example: MONGO_URI="mongodb://..." node apps/api/scripts/fix-patient-identity-indexes.mjs');
  process.exit(1);
}

const normalizedPhoneUniqueIndexName = 'normalizedPhone_1_unique';
const sameKey = (index, expectedKey) => JSON.stringify(index.key) === JSON.stringify(expectedKey);
const isConflictingNormalizedPhoneIndex = (index) => (
  sameKey(index, { normalizedPhone: 1 })
  && index.name !== normalizedPhoneUniqueIndexName
);

await mongoose.connect(mongoUri, { autoIndex: false });

try {
  const collection = mongoose.connection.db.collection('patientidentities');
  const before = await collection.indexes();
  console.log('Existing patientidentities indexes before migration:');
  console.log(JSON.stringify(before, null, 2));

  for (const index of before) {
    if (isConflictingNormalizedPhoneIndex(index)) {
      console.log(`Dropping index ${index.name}`);
      await collection.dropIndex(index.name);
    }
  }

  console.log(`Creating ${normalizedPhoneUniqueIndexName}`);
  await collection.createIndex(
    { normalizedPhone: 1 },
    {
      unique: true,
      name: normalizedPhoneUniqueIndexName,
      partialFilterExpression: { normalizedPhone: { $type: 'string' } }
    }
  );

  const after = await collection.indexes();
  console.log('Existing patientidentities indexes after migration:');
  console.log(JSON.stringify(after, null, 2));
} finally {
  await mongoose.disconnect();
}
