const fetch = require("node-fetch");
const fs = require("fs");
var parse = require("csv-parse/lib/sync");

// Hardcoded, minimizes need for dynamic code later
var square_coordinates = [
  [1, 1, 1, 2, 2, 2, 3, 3, 3],
  [1, 1, 1, 2, 2, 2, 3, 3, 3],
  [1, 1, 1, 2, 2, 2, 3, 3, 3],
  [4, 4, 4, 5, 5, 5, 6, 6, 6],
  [4, 4, 4, 5, 5, 5, 6, 6, 6],
  [4, 4, 4, 5, 5, 5, 6, 6, 6],
  [7, 7, 7, 8, 8, 8, 9, 9, 9],
  [7, 7, 7, 8, 8, 8, 9, 9, 9],
  [7, 7, 7, 8, 8, 8, 9, 9, 9],
];

function get_row(board, row) {
  // Given a board, we can return a single row
  return board[row];
}

function get_column(board, column) {
  // Given a board, we iterate the rows to return a column
  var col = [];
  for (let row = 0; row < 9; row++) {
    col.push(board[row][column]);
  }
  return col;
}

function get_square(board, square) {
  let cells = [];
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (square == square_coordinates[r][c]) {
        cells.push(board[r][c]);
      }
    }
  }
  return cells;
}

function complete_cell(board, r, c) {
  let used = [
    ...get_row(board, r),
    ...get_column(board, c),
    ...get_square(board, square_coordinates[r][c]),
  ];
  let possibilities = [];
  for (let p = 1; p <= 9; p++) {
    if (!used.includes(p)) {
      possibilities.push(p);
    }
  }
  if (possibilities.length == 1) {
    // If there is only one valid possibility, fill it in
    board[r][c] = possibilities[0];
    return true;
  } else {
    board[r][c] = possibilities;
    return false;
  }
}

function appears_once_only(board, possibilities, segment, r, c) {
  let updated = false;
  for (i = 0; i < possibilities.length; i++) {
    let possibility = possibilities[i];
    let counter = 0;
    segment.forEach((cell) => {
      if (Array.isArray(cell)) {
        if (cell.includes(possibility)) {
          counter++;
        }
      } else {
        if (cell == possibility) {
          counter++;
        }
      }
    });
    if (counter == 1) {
      board[r][c] = possibility;
      updated = true;
      break;
    }
  }
  return updated;
}

function compare(expected, actual) {
  let array1 = expected.slice();
  let array2 = actual.slice();
  return (
    array1.length === array2.length &&
    array1.sort().every(function (value, index) {
      return value === array2.sort()[index];
    })
  );
}

function is_solved(board) {
  let expected = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let valid = true;
  // Check all rows
  for (r = 0; r < 9 && valid == true; r++) {
    if (!compare(expected, get_row(board, r))) {
      valid = false;
    }
  }
  // Check all columns
  for (c = 0; c < 9 && valid == true; c++) {
    if (!compare(expected, get_column(board, c))) {
      valid = false;
    }
  }
  // Check all quadrants
  for (q = 1; q < 9 && valid == true; q++) {
    if (!compare(expected, get_square(board, q))) {
      valid = false;
    }
  }
  return valid;
}

function backtrack_based(orig_board) {
  // Create a temporary board for our recursion.
  let board = JSON.parse(JSON.stringify(orig_board));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      // Process each incomplete cell
      if (board[r][c] == 0) {
        complete_cell(board, r, c);
        if (is_solved(board)) return board;
        let cell = board[r][c];
        // If we just created a list of possibilities, iterate them and recurse
        if (Array.isArray(cell)) {
          for (let i = 0; i < cell.length; i++) {
            // Create a temporary board for each recursion.
            let board_2 = JSON.parse(JSON.stringify(board));
            // Choose a value
            board_2[r][c] = cell[i];
            // Recurse again using new board
            if ((completed_board = backtrack_based(board_2))) {
              return completed_board;
            }
          }
          return false; // dead end
        }
      }
    }
  }

  return false;
}

// Constraint based pass.
// Apply the rules of Sudoku and mark up the cells we are
// 100% can only be a single value.
function one_value_cell_constraint(board) {
  // Set to false at the start of the loop
  updated = false;

  // Convert every gap into an array of possibilities
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] == 0) {
        updated = complete_cell(board, r, c) || updated;
      }
    }
  }

  // Look out for any possibility that appears as a possibility
  // once-only in the row, column, or quadrant.
  // If it does, fill it in!
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (Array.isArray(board[r][c])) {
        let possibilities = board[r][c];
        updated =
          appears_once_only(board, possibilities, get_row(board, r), r, c) ||
          appears_once_only(board, possibilities, get_column(board, c), r, c) ||
          appears_once_only(
            board,
            possibilities,
            get_square(board, square_coordinates[r][c]),
            r,
            c
          ) ||
          updated;
      }
    }
  }

  // Reinitialize gaps back to zero before ending
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (Array.isArray(board[r][c])) {
        board[r][c] = 0;
      }
    }
  }

  return updated;
}

function solve(board) {
  let updated = true,
    solved = false;

  /* 
      Easy-Hard are solved via iterations where we look at the current
      board and fill in any 100% guaranteed cells. We keep using the
      same board, and fill in the gaps until solved.
      
      Always do this first.  We can make the board simpler, even if we
      are unable to crack it entirely this way.

      Tests show doing this FIRST is quicker for Hard-Evil sudoko as it
      removes the number of blank cells ahead of the brute force.
  */
  while (updated && !solved) {
    updated = one_value_cell_constraint(board);
    solved = is_solved(board);
  }

  // Hard-Evil need brute force to finish off.
  if (!solved) {
    board = backtrack_based(board);
    solved = is_solved(board);
  }

  return board;
}

function print_cell(value) {
  if (Array.isArray(value)) {
    return ".";
  } else if (value == 0) {
    return ".";
  } else {
    return value;
  }
}

function print_board(gameArr) {
  console.log();
  for (i = 0; i < 9; i++) {
    let row = get_row(gameArr, i);
    if (i % 3 == 0) {
      console.log("|=======|=======|=======|");
    }
    console.log(
      "|",
      print_cell(row[0]),
      print_cell(row[1]),
      print_cell(row[2]),
      "|",
      print_cell(row[3]),
      print_cell(row[4]),
      print_cell(row[5]),
      "|",
      print_cell(row[6]),
      print_cell(row[7]),
      print_cell(row[8]),
      "|"
    );
  }
  console.log("|=======|=======|=======|");
}

// var test = [
//   [0, 8, 0, 0, 0, 0, 9, 0, 0],
//   [0, 7, 5, 3, 6, 0, 0, 8, 0],
//   [0, 0, 0, 0, 4, 0, 0, 0, 0],
//   [6, 5, 0, 0, 0, 2, 3, 0, 0],
//   [0, 0, 0, 4, 5, 0, 0, 0, 0],
//   [2, 0, 9, 0, 0, 0, 0, 0, 0],
//   [0, 0, 0, 0, 0, 7, 5, 0, 0],
//   [0, 0, 0, 0, 1, 3, 6, 0, 0],
//   [1, 0, 0, 0, 0, 0, 0, 0, 2],
// ];

async function printCodes() {
  const fileContent = await fs.promises.readFile(__dirname + "/board.csv");
  const records = parse(fileContent, { columns: false });

  let sudoku = [];
  await records.map((record) => {
    sudoku.push(record);
  });

  var arrInt = [];
  sudoku.map((arrays) => {
    var tempArr = [];
    arrays.map((number, i) => {
      tempArr.push(parseInt(number));
    });
    arrInt.push(tempArr);
  });

  print_board(arrInt);
  print_board(solve(arrInt));
}

printCodes();
