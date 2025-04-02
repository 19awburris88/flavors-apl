const express = require('express');
const pg = require('pg');
const morgan = require('morgan');

const app = express();
const client = new pg.Client('postgres://localhost/flavor_db');

// Middleware
app.use(express.json());
app.use(morgan('dev'));

// Get all flavors
app.get('/api/flavors', async (req, res, next) => {
  try {
    const result = await client.query('SELECT * FROM flavors ORDER BY created_at DESC');
    res.send(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get a single flavor 
app.get('/api/flavors/:id', async (req, res, next) => {
  try {
    const result = await client.query('SELECT * FROM flavors WHERE id = $1', [req.params.id]);
    res.send(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Post a new flavor
app.post('/api/flavors', async (req, res, next) => {
  try {
    const SQL = `
      INSERT INTO flavors(name, is_favorite)
      VALUES($1, $2)
      RETURNING *;
    `;
    const result = await client.query(SQL, [
      req.body.name,
      req.body.is_favorite ?? false,
    ]);
    res.send(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update a flavor
app.put('/api/flavors/:id', async (req, res, next) => {
  try {
    const SQL = `
      UPDATE flavors
      SET name = $1,
          is_favorite = $2,
          updated_at = now()
      WHERE id = $3
      RETURNING *;
    `;
    const result = await client.query(SQL, [
      req.body.name,
      req.body.is_favorite,
      req.params.id,
    ]);
    res.send(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Delete a flavor
app.delete('/api/flavors/:id', async (req, res, next) => {
  try {
    await client.query('DELETE FROM flavors WHERE id = $1', [req.params.id]);
    res.sendStatus(204); // No Content
  } catch (err) {
    next(err);
  }
});

// Database setup 
const init = async () => {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    let SQL = `
      DROP TABLE IF EXISTS flavors;
      CREATE TABLE flavors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        is_favorite BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `;
    await client.query(SQL);
    console.log('✅ Table created');

    SQL = `
      INSERT INTO flavors(name, is_favorite) VALUES ('Vanilla', true);
      INSERT INTO flavors(name, is_favorite) VALUES ('Chocolate', false);
      INSERT INTO flavors(name, is_favorite) VALUES ('Strawberry', true);
    `;
    await client.query(SQL);
    console.log('✅ Sample data seeded');

    const port = process.env.PORT || 3000;
    app.listen(port, () => console.log(`🚀 Server is running on port ${port}`));
  } catch (err) {
    console.error('❌ Error during setup:', err);
  }
};

init();
