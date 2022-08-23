module.exports = (sequelize, DataTypes) => {
  const { UUID, TEXT, STRING, INTEGER } = DataTypes;

  const Signatures = sequelize.define('signatures', {
    'uuid': {
      type: UUID,
      comment: 'request uuid',
    },
    'tx_buffer': {
      type: TEXT,
    },
    'signature': {
      type: TEXT,
      comment: 'pubkey=signature separated by comma',
    },
    'result': {
      type: STRING,
      comment: 'SUCCSS | Error message'
    },
  }, {
    indexes: [{
      unique: true,
      fields: [ 'uuid' ],
    }],
  });

  return Signatures;
};

