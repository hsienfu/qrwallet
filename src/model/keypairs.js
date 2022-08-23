module.exports = (sequelize, DataTypes) => {
  const { STRING, INTEGER, BOOLEAN } = DataTypes;

  const Keypairs = sequelize.define('keypairs', {
    'pubkey': {
      type: STRING,
    },
    'secret_key': {
      type: STRING,
    },
  }, {
    indexes: [{
      unique: true,
      fields: [ 'pubkey' ],
    }],
  });

  return Keypairs;
};

