import express from 'express';
import path from 'path';
import mysql from 'mysql';
import crypto from 'node:crypto';
import session from 'express-session';
import memoryStore from 'memorystore';
import { parse } from 'fast-csv';
import fs from 'fs';
import multer from 'multer';


const port = 8080;
const app = express();
const SessionStore = memoryStore(session);
const storageVaksin = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './images');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const storageExcel = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './excel');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const uploadVaksin = multer({ storage: storageVaksin });
const uploadExcel = multer({ storage: storageExcel });

app.set('view engine', 'ejs');
app.use(express.static(path.resolve('public')));
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
    user: 'root',
    password: '',
    database: 'ptmt',
    host: '127.0.0.1'
});

const dbConnect = () => {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, conn) => {
            if (err) {
                reject(err);
            } else {
                resolve(conn);
            }
        })
    })
};

app.use(session({
    cookie: {
        httpOnly: false,
        sameSite: 'strict',
        maxAge: 1 * 60 * 60 * 1000
    },
    store: new SessionStore({
        checkPeriod: 1 * 60 * 60 * 1000
    }),
    name: 'SID',
    secret: 'this is my secret',
    resave: false,
    saveUninitialized: false
}));

const noParamQuery = (conn, queryString) => {
    return new Promise((resolve, reject) => {
        conn.query(queryString, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

const oneParamQuery = (conn, queryString, firstParam) => {
    return new Promise((resolve, reject) => {
        conn.query(queryString, firstParam, (err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
};

const authAdmin = async (req, res, next) => {
    if (!req.session.nama) {
        res.redirect('/login');
    } else if (req.session.role === 'Admin') {
        next();
    } else {
        res.render('noAccess');
    }
}

const authSatpam = async (req, res, next) => {
    if (!req.session.nama) {
        res.redirect('/login');
    } else if (req.session.role === 'Satpam') {
        next();
    } else {
        res.render('noAccess');
    }
}

const authGuru = async (req, res, next) => {
    if (!req.session.nama) {
        res.redirect('/login');
    } else if (req.session.role === 'Guru') {
        next();
    } else {
        res.render('noAccess');
    }
}

const authSiswa = async (req, res, next) => {
    if (!req.session.nama) {
        res.redirect('/login');
    } else if (req.session.role === 'Siswa') {
        next();
    } else {
        res.render('noAccess');
    }
}

const authKepsek = async (req, res, next) => {
    if (!req.session.nama) {
        res.redirect('/login');
    } else if (req.session.role === 'Kepsek') {
        next();
    } else {
        res.render('noAccess');
    }
}

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    let err;
    const errMsg = req.query.err;
    if (req.query.err) {
        err = true;
    }
    res.render('login', {
        error: err,
        msg: errMsg
    });
});

app.post('/login', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const hashed_pass = crypto.createHash('sha256').update(password).digest('base64');
    const credentials = [username, hashed_pass];
    const conn = await dbConnect();
    const cekUsername = await oneParamQuery(conn, 'SELECT ID_U FROM user WHERE username=?', username);
    if (cekUsername.length === 0) {
        conn.release;
        res.redirect('/login/?err=Username is not registered');
    } else {
        const queryResult = await oneParamQuery(conn, 'SELECT nama,role,ID_U FROM user WHERE username=? AND password=?', credentials);
        conn.release();
        if (queryResult.length === 1) {
            req.session.nama = queryResult[0].nama;
            req.session.role = queryResult[0].role;
            req.session.idU = queryResult[0].ID_U;
            if (queryResult[0].role === 'Admin') {
                res.redirect('/admin');
            } else if (queryResult[0].role === 'Siswa') {
                res.redirect('/siswa');
            } else if (queryResult[0].role === 'Guru') {
                res.redirect('/guru');
            } else if (queryResult[0].role === 'Satpam') {
                res.redirect('/satpam');
            } else {
                res.redirect('/kepsek');
            }
        } else {
            res.redirect('/login/?err=Wrong Password');
        }
    }
});

app.get('/changePasswordPage', (req, res) => {
    res.render('changePass', {
        err: false
    });
});

app.post('/changePassword', async (req, res) => {
    const nama = req.session.nama;
    const oldPass = req.body.oldpass;
    const hashed_oldPass = crypto.createHash('sha256').update(oldPass).digest('base64');
    const newPass = req.body.newpass;
    const cnfPass = req.body.confirmpass;
    const conn = await dbConnect();
    const password = await oneParamQuery(conn, 'SELECT password FROM user WHERE nama=?', nama);
    if (password[0].password === hashed_oldPass && newPass === cnfPass) {
        const hashed_pass = crypto.createHash('sha256').update(newPass).digest('base64');
        const newCredentials = [hashed_pass, nama];
        await oneParamQuery(conn, 'UPDATE user SET password=? WHERE nama=?', newCredentials);
        conn.release();
        res.redirect('/logout');
    } else {
        conn.release();
        res.render('changePass', {
            err: true
        });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

//admin
app.get('/admin', authAdmin, (req, res) => {
    res.render('admin', {
        role: req.session.role,
        nama: req.session.nama,
        date: new Date().toLocaleDateString('id')
    });
});

//admin-ruangan
app.get('/admin/ruangan', authAdmin, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const fullRuangan = await noParamQuery(conn, 'SELECT * FROM ruangan');
    const ruangan = await noParamQuery(conn, `SELECT * FROM ruangan LIMIT ${start},${show}`);
    conn.release();
    res.render('admin-ruangan', {
        ruangan: ruangan,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullRuangan.length - 1) / show),
        i: parseInt(start) + 1
    });
});

app.get('/admin/ruangan/tambah', authAdmin, (req, res) => {
    let err = false;
    if (req.query.err) {
        err = true;
    }
    res.render('admin-ruangan-tambah', {
        error: err
    });
});

app.post('/tambahRuangan', authAdmin, async (req, res) => {
    const kodeRuangan = req.body.kodeRuangan;
    const kapasitas = req.body.kapasitas;
    const conn = await dbConnect();
    const cekKode = await oneParamQuery(conn, 'SELECT nomorRuangan FROM ruangan WHERE kodeRuangan=?', kodeRuangan);
    if (cekKode.length === 0) {
        const newRoom = {
            kodeRuangan: kodeRuangan,
            kapasitas: kapasitas
        }
        await oneParamQuery(conn, 'INSERT INTO ruangan SET ?', newRoom);
        res.redirect('/admin/ruangan');
    } else {
        conn.release();
        res.redirect('admin/ruangan/tambah/?err=err');
    }
});

app.get('/admin/ruangan/edit/:kodeR/:kap', authAdmin, (req, res) => {
    let err = false;
    if (req.query.err) {
        err = true;
    }
    res.render('admin-ruangan-edit', {
        kodeRuangan: req.params.kodeR,
        kapasitas: req.params.kap,
        error: err
    });
});

app.post('/ubahRuangan/:command', authAdmin, async (req, res) => {
    const conn = await dbConnect();
    const detilRuangan = [req.body.kapasitas, req.body.kodeRuangan];
    if (req.params.command === 'change') {
        await oneParamQuery(conn, 'UPDATE ruangan SET kapasitas=? WHERE kodeRuangan=?', detilRuangan);
        conn.release();
        res.redirect('/admin/ruangan');
    } else {
        try {
            await oneParamQuery(conn, 'DELETE FROM ruangan WHERE kodeRuangan=?', req.body.kodeRuangan);
            conn.release();
            res.redirect('/admin/ruangan');
        } catch (error) {
            res.redirect(`/admin/ruangan/edit/${req.body.kodeRuangan}/${req.body.kapasitas}/?err=err`);
        }
    }
});


//admin-periode
app.get('/admin/periode', authAdmin, async (req, res) => {
    let filter = req.query.filter;
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    let sqlString = 'SELECT * FROM periode';
    if (filter !== undefined && filter !== 'Semua') {
        sqlString += ` WHERE status="${filter}"`
    }
    const conn = await dbConnect();
    const fullPeriode = await noParamQuery(conn, `${sqlString}`);
    const periode = await noParamQuery(conn, `${sqlString} LIMIT ${start},${show}`);
    conn.release();
    res.render('admin-periode', {
        periode: periode,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullPeriode.length - 1) / show),
        i: parseInt(start) + 1,
        filter: filter
    });
});

app.get('/admin/periode/tambah', authAdmin, (req, res) => {
    let err = false;
    if (req.query.err) {
        err = true;
    }
    res.render('admin-periode-tambah', {
        error: err
    });
});

app.post('/tambahPeriode', authAdmin, async (req, res) => {
    const nama = req.body.namaPer;
    const conn = await dbConnect();
    const ceknama = await oneParamQuery(conn, 'SELECT idPeriode FROM periode WHERE nama=?', nama);
    if (ceknama.length === 0) {
        const newP = {
            nama: nama,
            persentaseKapasitas: req.body.kap,
            tanggalMulai: req.body.tglMulai,
            tanggalSelesai: req.body.tglSelesai,
            status: 'Belum Dibuka'
        }
        await oneParamQuery(conn, 'INSERT INTO periode SET ?', newP);
        conn.release();
        res.redirect('/admin/periode');
    } else {
        conn.release();
        res.redirect('admin/periode/tambah?err=err');
    }
});

app.get('/admin/periode/edit/:nama/:mulai/:selesai/:kap/:status', authAdmin, (req, res) => {
    let err = false;
    if (req.query.err) {
        err = true
    }
    res.render('admin-periode-edit', {
        nama: req.params.nama,
        mulai: req.params.mulai,
        selesai: req.params.selesai,
        kap: req.params.kap,
        status: req.params.status,
        error: err
    });
});

app.post('/ubahPeriode/:command', authAdmin, async (req, res) => {
    const conn = await dbConnect();
    const detilPeriode = [req.body.status, req.body.kap, req.body.tglMulai, req.body.tglSelesai, req.body.namaPer];
    if (req.params.command === 'change') {
        await oneParamQuery(conn, 'UPDATE periode SET status=?, persentaseKapasitas=?, tanggalMulai=?, tanggalSelesai=? WHERE nama=?', detilPeriode);
        conn.release();
        res.redirect('/admin/periode');
    } else {
        try {
            await oneParamQuery(conn, 'DELETE FROM periode WHERE nama=?', req.body.namaPer);
            conn.release();
            res.redirect('/admin/periode');
        } catch (error) {
            res.redirect(`/admin/periode/edit/${req.body.namaPer}/${req.body.tglMulai}/${req.body.tglSelesai}/${req.body.kap}/${req.body.status}?err=err`)
        }
    }
});

app.get('/admin/periode/print/:idP', async (req, res) => {
    const conn = await dbConnect();
    const siswa = await oneParamQuery(conn, 'SELECT user.nama, kelas.nama AS "namaKelas" from pesertaptmt INNER JOIN user ON pesertaptmt.idSiswa = user.ID_U INNER JOIN kelas ON user.idKelas=kelas.idKelas WHERE pesertaptmt.idPeriode=? ORDER BY kelas.nama', req.params.idP);
    const periode = await oneParamQuery(conn, 'SELECT * FROM periode WHERE idPeriode=?', req.params.idP);
    conn.release();
    res.render('generateJadwal', {
        siswa: siswa,
        periode: periode[0]
    })
});


//admin-murid
app.get('/admin/murid', authAdmin, async (req, res) => {
    let search = req.query.search;
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    let sqlString = 'SELECT * FROM user WHERE role="siswa"';
    if (search !== undefined) {
        sqlString += ` AND nama LIKE "%${search}%"`
    }
    const conn = await dbConnect();
    const fullMurid = await noParamQuery(conn, `${sqlString}`);
    const murid = await noParamQuery(conn, `${sqlString} LIMIT ${start},${show}`);
    conn.release();
    res.render('admin-murid', {
        murid: murid,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        search: search,
        pageCount: Math.floor((fullMurid.length - 1) / show),
        i: parseInt(start) + 1
    });
});

app.get('/admin/murid/tambah', authAdmin, (req, res) => {
    res.render('admin-murid-tambah');
});

app.post('/tambahMurid', authAdmin, uploadExcel.single('addFile'), async (req, res) => {
    const dataMurid = [];
    fs.createReadStream(req.file.path)
        .pipe(parse({ headers: true }))
        .on('data', (data) => {
            dataMurid.push(data);
        })
        .on('end', async () => {
            const conn = await dbConnect();
            for (const data of dataMurid) {
                const kelas = await oneParamQuery(conn, 'SELECT idKelas FROM kelas WHERE nama=?', data.kelas);
                const hashed_pass = crypto.createHash('sha256').update(data.tanggalLahir.split('/').reverse().join('')).digest('base64');
                const user = {
                    username: data.nis,
                    nama: data.nama,
                    role: 'Siswa',
                    password: hashed_pass,
                    NIS: data.nis,
                    status: 0,
                    tanggalLahir: new Date(data.tanggalLahir.split('/').reverse().join('/')),
                    namaOrtu: data.namaOrtu,
                    emailOrtu: data.emailOrtu,
                    emailSiswa: data.email,
                    idKelas: kelas[0].idKelas
                };
                await oneParamQuery(conn, 'INSERT INTO user SET ?', user);
            }
            conn.release();
        });
    res.render('konfirmasiBerhasil');
});


//admin-guru
app.get('/admin/guru', authAdmin, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const fullGuru = await noParamQuery
        (conn,
            'SELECT user.ID_U, user.nama, kelas.nama AS "namaKelas", ruangan.kodeRuangan FROM user INNER JOIN kelas ON user.idKelas=kelas.idKelas INNER JOIN ruangan ON kelas.nomorRuangan=ruangan.nomorRuangan WHERE role="guru"'
        );
    const guru = await noParamQuery
        (conn,
            `SELECT user.ID_U, user.nama, kelas.nama AS "namaKelas", ruangan.kodeRuangan FROM user INNER JOIN kelas ON user.idKelas=kelas.idKelas INNER JOIN ruangan ON kelas.nomorRuangan=ruangan.nomorRuangan WHERE role="guru" LIMIT ${start},${show}`
        );
    conn.release();
    res.render('admin-guru', {
        guru: guru,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullGuru.length - 1) / show),
        i: parseInt(start) + 1
    });
});

app.get('/admin/guru/tambah', authAdmin, async (req, res) => {
    const conn = await dbConnect();
    const kelas = await noParamQuery(conn, 'SELECT nama FROM kelas');
    conn.release();
    res.render('admin-guru-tambah', {
        kelas: kelas
    });
});

app.post('/tambahGuru', authAdmin, async (req, res) => {
    const conn = await dbConnect();
    const kelas = await oneParamQuery(conn, 'SELECT idKelas FROM kelas WHERE nama=?', req.body.kls);
    const idKelas = kelas[0].idKelas;
    const hashed_pass = crypto.createHash('sha256').update('password').digest('base64');
    const newGuru = {
        username: req.body.nmGuru,
        nama: req.body.nmGuru,
        role: 'Guru',
        password: hashed_pass,
        idKelas: idKelas
    }
    await oneParamQuery(conn, 'INSERT INTO user SET ?', newGuru);
    conn.release();
    res.redirect('/admin/guru');
});

app.get('/admin/guru/edit/:namag/:namak', authAdmin, async (req, res) => {
    const conn = await dbConnect();
    const kelas = await noParamQuery(conn, 'SELECT nama FROM kelas');
    conn.release();
    res.render('admin-guru-edit', {
        namaG: req.params.namag,
        namaKelas: req.params.namak,
        kelas: kelas
    });
});

app.post('/ubahGuru/:command', authAdmin, async (req, res) => {
    const conn = await dbConnect();
    if (req.params.command === 'change') {
        const kelas = await oneParamQuery(conn, 'SELECT idKelas FROM kelas WHERE nama=?', req.body.kls);
        const detilGuru = [kelas[0].idKelas, req.body.nmGuru];
        await oneParamQuery(conn, 'UPDATE user SET idKelas=? WHERE nama=?', detilGuru);
    } else {
        await oneParamQuery(conn, 'DELETE FROM user WHERE nama=?', req.body.nmGuru);
    }
    conn.release();
    res.redirect('/admin/guru');
});

//admin-akun
app.get('/admin/akun', authAdmin, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const fullUser = await noParamQuery(conn, 'SELECT * FROM user');
    const user = await noParamQuery(conn, `SELECT * FROM user LIMIT ${start},${show}`);
    conn.release();
    res.render('admin-akun', {
        user: user,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullUser.length - 1) / show),
        i: parseInt(start) + 1
    });
});

app.get('/admin/akun/tambah', authAdmin, (req, res) => {
    let err = false;
    if (req.query.err) {
        err = true;
    }
    res.render('admin-akun-tambah', {
        error: err
    });
});

app.post('/tambahAkun', authAdmin, async (req, res) => {
    const pass = crypto.createHash('sha256').update(req.body.pword).digest('base64');
    const username = req.body.uname;
    const conn = await dbConnect();
    const cekUsername = await oneParamQuery(conn, 'SELECT ID_U FROM user WHERE username=?', username);
    if (cekUsername.length === 0) {
        const newAkun = {
            nama: req.body.nama,
            username: username,
            role: req.body.role1,
            password: pass
        }
        await oneParamQuery(conn, 'INSERT INTO user SET ?', newAkun);
        conn.release();
        res.redirect('/admin/akun');
    } else {
        conn.release();
        res.redirect('/admin/akun/tambah?err=err');
    }
});

app.get('/admin/akun/edit/:nama/:role', authAdmin, async (req, res) => {
    let err = false;
    if (req.query.err) {
        err = true;
    }
    const conn = await dbConnect();
    const credentials = await oneParamQuery(conn, 'SELECT username, password FROM user WHERE nama=?', req.params.nama);
    conn.release();
    res.render('admin-akun-edit', {
        nama: req.params.nama,
        role: req.params.role,
        username: credentials[0].username,
        password: crypto.createHash('sha256').update(credentials[0].password).digest('base64'),
        error: err
    });
});

app.post('/ubahAkun/:command', authAdmin, async (req, res) => {
    const conn = await dbConnect();
    if (req.params.command === 'change') {
        const hashed_pass = crypto.createHash('sha256').update(req.body.pword).digest('base64');
        const username = req.body.uname;
        const nama = req.body.nama;
        const role = req.body.role1;
        const cekUsername = await oneParamQuery(conn, 'SELECT ID_U FROM user WHERE nama<>? AND username=?', [nama, username]);
        if (cekUsername.length === 0) {
            const detilAkun = [username, role, hashed_pass, nama];
            await oneParamQuery(conn, 'UPDATE user SET username=?, role=?, password=? WHERE nama=?', detilAkun);
            conn.release();
            res.redirect('/admin/akun');
        } else {
            conn.release();
            res.redirect(`/admin/akun/edit/${nama}/${role}/?err=err`);
        }
    } else {
        await oneParamQuery(conn, 'DELETE FROM user WHERE username=?', req.body.uname);
        conn.release();
        res.redirect('/admin/akun');
    }
});


//satpam
app.get('/satpam', authSatpam, (req, res) => {
    res.render('satpam', {
        role: req.session.role,
        nama: req.session.nama,
        date: new Date().toLocaleDateString('id'),
        err: false
    });
});

app.post('/cekNIS', authSatpam, async (req, res) => {
    const nis = req.body.nis;
    const today = new Date();
    const conn = await dbConnect();
    const periode = await oneParamQuery(conn, 'SELECT idPeriode FROM periode WHERE tanggalMulai<=? AND tanggalSelesai>=?', [today, today]);
    const murid = await oneParamQuery(conn, 'SELECT ID_U,nama FROM user WHERE NIS=?', nis);
    if (murid.length !== 0) {
        const validate = await oneParamQuery(conn, 'SELECT id FROM pesertaptmt WHERE idPeriode=? AND idSiswa=?', [periode[0].idPeriode, murid[0].ID_U]);
        conn.release();
        if (validate.length != 0) {
            res.render('satpam-berhasil', {
                nama: murid[0].nama,
                nis: nis,
                role: req.session.role,
                date: new Date().toLocaleDateString('id')
            });
        } else {
            res.render('satpam-gagal', {
                nama: murid[0].nama,
                nis: nis,
                role: req.session.role,
                date: new Date().toLocaleDateString('id')
            });
        }
    } else {
        res.render('satpam', {
            role: req.session.role,
            nama: req.session.nama,
            date: new Date().toLocaleDateString('id'),
            err: true
        });
    }
});


//guru
app.get('/guru', authGuru, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const detilKelas = await oneParamQuery(conn, 'SELECT kelas.nama, ruangan.kodeRuangan FROM user INNER JOIN kelas ON user.idKelas=kelas.idKelas INNER JOIN ruangan ON kelas.nomorRuangan=ruangan.nomorRuangan WHERE user.ID_U=?', req.session.idU);
    const fullperiode = await noParamQuery(conn, 'SELECT * FROM periode');
    const periode = await noParamQuery(conn, `SELECT * FROM periode LIMIT ${start},${show}`);
    conn.release();
    res.render('guru', {
        role: req.session.role,
        namaKelas: detilKelas[0].nama,
        kodeR: detilKelas[0].kodeRuangan,
        periode: periode,
        nama: req.session.nama,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullperiode.length - 1) / show),
        i: parseInt(start) + 1
    });
});

app.get('/guru/viewMurid/:idP', authGuru, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const detilKelas = await oneParamQuery(conn, 'SELECT kelas.idKelas, kelas.nama, ruangan.kodeRuangan FROM user INNER JOIN kelas ON user.idKelas=kelas.idKelas INNER JOIN ruangan ON kelas.nomorRuangan=ruangan.nomorRuangan WHERE user.ID_U=?', req.session.idU);
    const detilPeriode = await oneParamQuery(conn, 'SELECT * FROM periode WHERE idPeriode=?', req.params.idP);
    const fullmurid = await oneParamQuery(conn, 'SELECT user.nama,user.NIS FROM user INNER JOIN pesertaptmt ON user.ID_U=pesertaptmt.idSiswa WHERE pesertaptmt.idPeriode=? AND user.idKelas=?', [req.params.idP, detilKelas[0].idKelas]);
    const murid = await oneParamQuery(conn, `SELECT user.nama,user.NIS FROM user INNER JOIN pesertaptmt ON user.ID_U=pesertaptmt.idSiswa WHERE pesertaptmt.idPeriode=? AND user.idKelas=? LIMIT ${start},${show}`, [req.params.idP, detilKelas[0].idKelas]);
    conn.release();
    res.render('guru-viewMurid', {
        role: req.session.role,
        detilKelas: detilKelas,
        detilPeriode: detilPeriode,
        murid: murid,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullmurid.length - 1) / show)
    });
});


//siswa
app.get('/siswa', authSiswa, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const fullperiode = await oneParamQuery(conn, 'SELECT * FROM pesertaptmt INNER JOIN periode ON pesertaptmt.idPeriode=periode.idPeriode WHERE pesertaptmt.idSiswa=?', req.session.idU);
    const periode = await oneParamQuery(conn, `SELECT * FROM pesertaptmt INNER JOIN periode ON pesertaptmt.idPeriode=periode.idPeriode WHERE pesertaptmt.idSiswa=? LIMIT ${start},${show}`, req.session.idU);
    const vaksin = await oneParamQuery(conn, 'SELECT vaksinDosisKe FROM user WHERE ID_U=?', req.session.idU);
    conn.release();
    let error = 'none';
    if (vaksin[0].vaksinDosisKe === null) {
        error = 'noVaksin'
    } else if (vaksin[0].vaksinDosisKe < 2) {
        error = 'vaksinKurang'
    }
    res.render('siswa', {
        periode: periode,
        role: req.session.role,
        nama: req.session.nama,
        date: new Date().toLocaleDateString('id'),
        error: error,
        pageCount: Math.floor((fullperiode.length - 1) / show)
    });
});

app.get('/siswa/vaksin', authSiswa, (req, res) => {
    res.render('siswa-vaksin', {
        role: req.session.role,
        date: new Date().toLocaleDateString('id')
    });
});

app.post('/inputVaksin', authSiswa, uploadVaksin.single('bukti'), async (req, res) => {
    const dosis = req.body.dosis;
    const tgl = req.body.tanggal;
    const bukti = req.file.path;
    const detilVaksin = [dosis, tgl, bukti, req.session.idU];
    const conn = await dbConnect();
    await oneParamQuery(conn, 'UPDATE user SET vaksinDosisKe=?,vaksinTanggal=?,vaksinBukti=? WHERE ID_U=?', detilVaksin);
    conn.release();
    res.redirect('/siswa');
})

app.get('/siswa/periode', authSiswa, async (req, res) => {
    let err = false;
    if (req.query.err) {
        err = true;
    }
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const kelas = await oneParamQuery(conn, 'SELECT idKelas FROM user WHERE ID_U=?', req.session.idU);
    const kapasitas = await oneParamQuery(conn, 'SELECT kapasitas FROM kelas WHERE idKelas=?', kelas[0].idKelas);
    const fullPeriode = await oneParamQuery(conn, 'SELECT periode.*, COUNT(pesertaptmt.idSiswa) AS "jumlahSiswa" FROM pesertaptmt INNER JOIN ( SELECT user.ID_U FROM user INNER JOIN kelas ON user.idKelas=kelas.idKelas WHERE user.role = "siswa" AND user.idKelas = ? )AS tabelSiswa ON tabelSiswa.ID_U = pesertaptmt.idSiswa RIGHT OUTER JOIN periode ON pesertaptmt.idPeriode = periode.idPeriode WHERE periode.status="Dibuka" GROUP BY periode.idPeriode ORDER BY periode.idPeriode', kelas[0].idKelas);
    const periode = await oneParamQuery(conn, `SELECT periode.*, COUNT(pesertaptmt.idSiswa) AS "jumlahSiswa" FROM pesertaptmt INNER JOIN ( SELECT user.ID_U FROM user INNER JOIN kelas ON user.idKelas=kelas.idKelas WHERE user.role = "siswa" AND user.idKelas = ? )AS tabelSiswa ON tabelSiswa.ID_U = pesertaptmt.idSiswa RIGHT OUTER JOIN periode ON pesertaptmt.idPeriode = periode.idPeriode WHERE periode.status="Dibuka" GROUP BY periode.idPeriode ORDER BY periode.idPeriode LIMIT ${start},${show}`, kelas[0].idKelas);
    const status = await oneParamQuery(conn, 'SELECT * FROM ( SELECT * FROM pesertaptmt WHERE idSiswa = ? ) AS perSiswa RIGHT OUTER JOIN periode ON perSiswa.idPeriode = periode.idPeriode WHERE periode.status="Dibuka" ORDER BY periode.idPeriode', req.session.idU);
    conn.release();
    res.render('siswa-periode', {
        periode: periode,
        kapasitas: kapasitas[0].kapasitas,
        status: status,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor(fullPeriode.length / show),
        i: parseInt(start) + 1,
        error: err
    });
});

app.post('/ubahStatus/:idP/:currSiswa/:maxSiswa', authSiswa, async (req, res) => {
    const status = req.body.status;
    if (parseInt(req.params.currSiswa) >= parseInt(req.params.maxSiswa) && status==='Tidak Bersedia') {
        res.redirect('/siswa/periode?err=err');
    } else {
        const conn = await dbConnect();
        const kelas = await oneParamQuery(conn, 'SELECT idKelas FROM user WHERE ID_U=?', req.session.idU);
        if (status === 'Bersedia') {
            await oneParamQuery(conn, 'DELETE FROM pesertaptmt WHERE idSiswa=? AND idPeriode=?', [req.session.idU, req.params.idP]);
            const counterBersedia = await oneParamQuery(conn, 'SELECT * FROM ( SELECT * FROM pesertaptmt WHERE idSiswa = ? ) AS perSiswa RIGHT OUTER JOIN periode ON perSiswa.idPeriode = periode.idPeriode WHERE perSiswa.idSiswa IS NOT NULL ORDER BY periode.idPeriode', req.session.idU);
            if (counterBersedia.length === 0) {
                await oneParamQuery(conn, 'UPDATE user SET status=0 WHERE ID_U=?', req.session.idU);
            }
            const sisaSiswa = await oneParamQuery(conn, 'SELECT * FROM (SELECT ID_U from user WHERE idKelas=? AND role="siswa") as tabelSiswa INNER JOIN pesertaptmt ON pesertaptmt.idSiswa=tabelSiswa.ID_U WHERE pesertaptmt.idSiswa<>tabelSiswa.ID_U AND pesertaptmt.idPeriode=?', [kelas[0].idKelas, req.params.idP]);
            if (sisaSiswa.length === 0) {
                await oneParamQuery(conn, 'DELETE FROM kelasptmt WHERE idKelas=? AND idPeriode=?', [kelas[0].idKelas, req.params.idP]);
            }
        } else {
            await oneParamQuery(conn, 'INSERT INTO pesertaptmt(idSiswa,idPeriode) VALUES(?,?)', [req.session.idU, req.params.idP]);
            await oneParamQuery(conn, 'UPDATE user SET status=1 WHERE ID_U=?', req.session.idU);
            const cekKelas = await oneParamQuery(conn, 'SELECT * FROM kelasptmt WHERE idPeriode=? AND idKelas=?', [req.params.idP, kelas[0].idKelas]);
            if (cekKelas.length === 0) {
                await oneParamQuery(conn, 'INSERT INTO kelasptmt(idPeriode, idKelas) VALUES(?,?)', [req.params.idP, kelas[0].idKelas]);
            }
        }
        conn.release();
        res.redirect('/siswa/periode');
    }
});


//kepsek
app.get('/kepsek', authKepsek, (req, res) => {
    res.render('kepsek', {
        role: req.session.role,
        nama: req.session.nama,
        date: new Date().toLocaleDateString('id')
    });
});

app.get('/kepsek/rekap', (req, res) => {
    res.redirect('/rekapPeriode');
});

app.get('/rekapPeriode', authKepsek, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const fullperiode = await noParamQuery(conn, 'SELECT * FROM( SELECT periode.*, COUNT(pesertaptmt.idSiswa) AS "banyakSiswa" FROM pesertaptmt RIGHT OUTER JOIN periode ON pesertaptmt.idPeriode = periode.idPeriode GROUP BY periode.idPeriode ORDER BY periode.idPeriode) AS mainTable INNER JOIN (SELECT periode.idPeriode, COUNT(kelasptmt.idKelas) AS "banyakKelas" FROM kelasptmt RIGHT OUTER JOIN periode ON kelasptmt.idPeriode = periode.idPeriode GROUP BY periode.idPeriode ORDER BY periode.idPeriode) AS counterkelas ON counterKelas.idPeriode = mainTable.idPeriode');
    const periode = await noParamQuery(conn, `SELECT * FROM( SELECT periode.*, COUNT(pesertaptmt.idSiswa) AS "banyakSiswa" FROM pesertaptmt RIGHT OUTER JOIN periode ON pesertaptmt.idPeriode = periode.idPeriode GROUP BY periode.idPeriode ORDER BY periode.idPeriode) AS mainTable INNER JOIN (SELECT periode.idPeriode, COUNT(kelasptmt.idKelas) AS "banyakKelas" FROM kelasptmt RIGHT OUTER JOIN periode ON kelasptmt.idPeriode = periode.idPeriode GROUP BY periode.idPeriode ORDER BY periode.idPeriode) AS counterkelas ON counterKelas.idPeriode = mainTable.idPeriode LIMIT ${start},${show}`);
    conn.release();
    res.render('kepsek-rekap-periode', {
        periode: periode,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullperiode.length - 1) / show),
        i: parseInt(start) + 1
    });
});

app.get('/rekapKelas', authKepsek, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const fullkelas = await noParamQuery(conn, 'SELECT mainTable.*, periodeTable.*, guruTable.namaGuru FROM (SELECT kelas.*, COUNT(kelasptmt.idPeriode) AS "counterKelas" FROM kelas LEFT OUTER JOIN kelasptmt ON kelas.idKelas = kelasptmt.idKelas GROUP BY kelas.idKelas) AS mainTable CROSS JOIN (SELECT COUNT(periode.idPeriode)AS "counterPeriode" FROM periode) AS periodeTable LEFT OUTER JOIN (SELECT nama AS "namaGuru", idKelas FROM user WHERE role="guru") AS guruTable ON mainTable.idKelas = guruTable.idKelas');
    const kelas = await noParamQuery(conn, `SELECT mainTable.*, periodeTable.*, guruTable.namaGuru FROM (SELECT kelas.*, COUNT(kelasptmt.idPeriode) AS "counterKelas" FROM kelas LEFT OUTER JOIN kelasptmt ON kelas.idKelas = kelasptmt.idKelas GROUP BY kelas.idKelas) AS mainTable CROSS JOIN (SELECT COUNT(periode.idPeriode)AS "counterPeriode" FROM periode) AS periodeTable LEFT OUTER JOIN (SELECT nama AS "namaGuru", idKelas FROM user WHERE role="guru") AS guruTable ON mainTable.idKelas = guruTable.idKelas LIMIT ${start},${show}`);
    conn.release();
    res.render('kepsek-rekap-kelas', {
        kelas: kelas,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullkelas.length - 1) / show),
        i: parseInt(start) + 1
    });
});

app.get('/rekapGuru', authKepsek, async (req, res) => {
    let start = req.query.start;
    if (!start) {
        start = 0;
    }
    const show = 5;
    const conn = await dbConnect();
    const fullguru = await noParamQuery(conn, 'SELECT tabelGuru.*, COUNT(kelasptmt.idPeriode) AS "counterKelas", periodeTable.* FROM (SELECT user.nama, kelas.idKelas, kelas.nama AS "namaKelas" FROM user LEFT OUTER JOIN kelas ON user.idKelas = kelas.idKelas WHERE USER.role = "guru") as tabelGuru LEFT OUTER JOIN kelasptmt ON tabelGuru.idKelas = kelasptmt.idKelas CROSS JOIN (SELECT COUNT(periode.idPeriode)AS "counterPeriode" FROM periode) AS periodeTable GROUP BY tabelGuru.idKelas');
    const guru = await noParamQuery(conn, `SELECT tabelGuru.*, COUNT(kelasptmt.idPeriode) AS "counterKelas", periodeTable.* FROM (SELECT user.nama, kelas.idKelas, kelas.nama AS "namaKelas" FROM user LEFT OUTER JOIN kelas ON user.idKelas = kelas.idKelas WHERE USER.role = "guru") as tabelGuru LEFT OUTER JOIN kelasptmt ON tabelGuru.idKelas = kelasptmt.idKelas CROSS JOIN (SELECT COUNT(periode.idPeriode)AS "counterPeriode" FROM periode) AS periodeTable GROUP BY tabelGuru.idKelas LIMIT ${start},${show}`);
    conn.release();
    res.render('kepsek-rekap-guru', {
        guru: guru,
        role: req.session.role,
        date: new Date().toLocaleDateString('id'),
        pageCount: Math.floor((fullguru.length - 1) / show),
        i: parseInt(start) + 1
    });
});

app.get('/kepsek/grafik', authKepsek, async (req, res) => {
    res.render('kepsek-grafik', {
        role: req.session.role,
        date: new Date().toLocaleDateString('id')
    });
});

app.get('/grafikMurid', authKepsek, async (req, res) => {
    const conn = await dbConnect();
    const tableData = await noParamQuery(conn, 'SELECT periode.nama, COUNT(pesertaptmt.idSiswa) AS "banyakSiswa" FROM pesertaptmt RIGHT OUTER JOIN periode ON pesertaptmt.idPeriode = periode.idPeriode GROUP BY periode.nama ORDER BY periode.idPeriode')
    conn.release();
    let label = '';
    let data = '';
    for (const d of tableData) {
        if (label !== '') {
            label = `${label},${d.nama}`
        } else {
            label = `${d.nama}`
        }
        if (data !== '') {
            data = `${data},${d.banyakSiswa}`
        } else {
            data = `${d.banyakSiswa}`
        }
    }
    res.send(`${label}|${data}`);
});

app.get('/grafikGuru', authKepsek, async (req, res) => {
    const conn = await dbConnect();
    const tableData = await noParamQuery(conn, 'SELECT periode.nama, COUNT(kelasptmt.idKelas) AS "banyakGuru" FROM kelasptmt RIGHT OUTER JOIN periode ON kelasptmt.idPeriode = periode.idPeriode GROUP BY periode.nama ORDER BY periode.idPeriode')
    conn.release();
    let label = '';
    let data = '';
    for (const d of tableData) {
        if (label !== '') {
            label = `${label},${d.nama}`
        } else {
            label = `${d.nama}`
        }
        if (data !== '') {
            data = `${data},${d.banyakGuru}`
        } else {
            data = `${d.banyakGuru}`
        }
    }
    res.send(`${label}|${data}`);
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});