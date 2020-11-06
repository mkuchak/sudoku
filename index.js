const fetch = require("node-fetch");
const fs = require("fs");
var parse = require("csv-parse/lib/sync");

// Matriz de ajuda para facilitar identificação de quadrantes
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

// Retorna conjunto de linha referida
function get_row(board, row) {
  return board[row];
}

// Retorna conjunto da coluna referida
function get_column(board, column) {
  var col = [];
  for (let row = 0; row < 9; row++) {
    col.push(board[row][column]);
  }
  return col;
}

// Retorna quadrante 3x3 referido
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

// Completa quadrante
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
    // Se houver uma única possibilidade válida, preenche
    board[r][c] = possibilities[0];
    return true;
  } else {
    board[r][c] = possibilities;
    return false;
  }
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

// Checa se o tabuleiro está resolvido e não há inconsistências
function is_solved(board) {
  let expected = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  let valid = true;
  // Checa todas linhas
  for (r = 0; r < 9 && valid == true; r++) {
    if (!compare(expected, get_row(board, r))) {
      valid = false;
    }
  }
  // Checa todas colunas
  for (c = 0; c < 9 && valid == true; c++) {
    if (!compare(expected, get_column(board, c))) {
      valid = false;
    }
  }
  // Checa todas quadrantes
  for (q = 1; q < 9 && valid == true; q++) {
    if (!compare(expected, get_square(board, q))) {
      valid = false;
    }
  }
  return valid;
}

function backtrack_based(orig_board) {
  // Cria um quadro temporário para cada recursão
  let board = JSON.parse(JSON.stringify(orig_board));

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      // Processa cada célula incompleta
      if (board[r][c] == 0) {
        complete_cell(board, r, c);
        if (is_solved(board)) return board;
        let cell = board[r][c];
        // Interage recursivamente
        if (Array.isArray(cell)) {
          for (let i = 0; i < cell.length; i++) {
            // Cria um tabuleiro temporário para cada recursão
            let board_2 = JSON.parse(JSON.stringify(board));
            // Escolhe novo valor
            board_2[r][c] = cell[i];
            // Tenta recursivamente de novo com novo tabuleiro
            if ((completed_board = backtrack_based(board_2))) {
              return completed_board;
            }
          }
          return false; // Inconsistência no tabuleiro
        }
      }
    }
  }

  return false;
}

function solve(board) {
  board = backtrack_based(board);

  if (is_solved(board)) return board;
  else return "Dead end.";
}

// Imprime na tela a divisão da grade
function print_cell(value) {
  if (Array.isArray(value)) {
    return ".";
  } else if (value == 0) {
    return ".";
  } else {
    return value;
  }
}

// Imprime na tela o tabuleiro referido
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

async function main() {
  // Algoritmo obtém dados do arquivo CSV e joga em um uma matriz de inteiros
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

  // Imprime na tela tabuleiro atual na tela
  print_board(arrInt);

  // Inicia a resolução do tabuleiro e imprime resultado na tela
  print_board(solve(arrInt));
}

main();
