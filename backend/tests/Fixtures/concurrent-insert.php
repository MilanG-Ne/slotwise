<?php

// Deliberately bypass Eloquent to prove the database invariant protects every writer.
$input = json_decode(stream_get_contents(STDIN), true, flags: JSON_THROW_ON_ERROR);
$db = new PDO($input['dsn'], $input['username'], $input['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$db->exec("SET application_name = 'slotwise-concurrency-test'");
$db->exec("SET statement_timeout = '10s'");
echo "ready\n";
flush();
try {
    $statement = $db->prepare("INSERT INTO bookings (resource_id, user_id, title, starts_at, ends_at) VALUES (?, ?, 'Concurrent reservation', '2026-09-26 08:30:00+00', '2026-09-26 09:30:00+00')");
    $statement->execute([$input['resource_id'], $input['user_id']]);
    echo 'created';
} catch (PDOException $exception) {
    echo $exception->getCode();
}
