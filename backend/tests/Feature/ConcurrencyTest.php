<?php

namespace Tests\Feature;

use App\Models\Resource;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class ConcurrencyTest extends TestCase
{
    use DatabaseMigrations;

    #[DataProvider('transactionOutcomes')]
    public function test_overlapping_writer_waits_for_the_first_transaction_then_resolves(bool $commit, string $result): void
    {
        $resource = Resource::factory()->create();
        $user = User::factory()->create();
        $config = config('database.connections.pgsql');
        $dsn = "pgsql:host={$config['host']};port={$config['port']};dbname={$config['database']}";
        $observer = new \PDO($dsn, $config['username'], $config['password']);
        DB::beginTransaction();
        DB::insert("INSERT INTO bookings (resource_id, user_id, title, starts_at, ends_at) VALUES (?, ?, 'First reservation', '2026-09-26 08:00:00+00', '2026-09-26 09:00:00+00')", [$resource->id, $user->id]);
        $process = new Process([PHP_BINARY, base_path('tests/Fixtures/concurrent-insert.php')]);
        $process->setInput(json_encode(['dsn' => $dsn, 'username' => $config['username'], 'password' => $config['password'], 'resource_id' => $resource->id, 'user_id' => $user->id], JSON_THROW_ON_ERROR));
        $process->setTimeout(15);

        try {
            $process->start();
            $deadline = microtime(true) + 8;
            $waiting = false;
            do {
                $waiting = $observer->query("SELECT count(*) FROM pg_stat_activity WHERE application_name = 'slotwise-concurrency-test' AND wait_event_type = 'Lock'")->fetchColumn() > 0;
                if ($waiting) {
                    break;
                }
                usleep(10000);
            } while (microtime(true) < $deadline && $process->isRunning());
            $this->assertTrue($waiting, 'The second real connection must block on the uncommitted exclusion constraint. '.$process->getErrorOutput());
            if ($commit) {
                DB::commit();
            } else {
                DB::rollBack();
            }
            $process->wait();

            $this->assertSame(0, $process->getExitCode(), $process->getErrorOutput());
            $this->assertSame("ready\n".$result, $process->getOutput());
            $this->assertDatabaseCount('bookings', 1);
            $this->assertDatabaseHas('bookings', ['title' => $commit ? 'First reservation' : 'Concurrent reservation']);
        } finally {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            $process->stop();
        }
    }

    public static function transactionOutcomes(): array
    {
        return ['winner commits' => [true, '23P01'], 'first writer rolls back' => [false, 'created']];
    }
}
