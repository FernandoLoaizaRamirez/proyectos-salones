# Una vitrina para cada visitante

**Qué cambia, en una frase:** cada persona que abre una demo estrena su propia
copia privada, en vez de compartir una sola con todo el mundo.

---

## Por qué hacía falta

Hasta ahora, todas las demostraciones caían en un mismo evento llamado `demo`.
Eso se notaba justo donde más duele, que es cuando un salón la está probando:

- **Las demos abrían vacías.** Los datos de ejemplo (las mesas, las canciones,
  los pases) no se podían guardar en el servidor: cada dato tiene un
  identificador único en toda la base, así que sembrar los mismos ejemplos en
  dos eventos chocaba — y una boda de verdad podía acabar naciendo con los
  invitados de "Ana & Rodrigo" dentro.
- **Lo que subía uno lo veían todos.** Un salón abría la demo del álbum y se
  encontraba las fotos de prueba de otra persona.
- **Y si alguien borraba algo, se lo borraba a los demás.**

Ahora cada navegador recibe la suya: `demo-k3f9x2`, `demo-p8w1za`… Su acomodo,
sus canciones y sus fotos son suyos. Y si el salón comparte el código QR de su
demo, **quien lo escanee cae en SU vitrina** — que es exactamente lo que quiere
enseñar cuando le está demostrando a un cliente que "todo se junta solo".

---

## Lo que tienes que hacer tú (una sola vez, 2 minutos)

El código ya está publicado y **no rompe nada mientras tanto**: mientras no des
este paso, las demos siguen funcionando como siempre, con la vitrina compartida.
Cuando lo des, cada visitante empieza a recibir la suya, solo.

1. Entra a **Supabase → tu proyecto → SQL Editor** (menú de la izquierda).
2. Abre el archivo `supabase/migrations/0022_vitrina_por_visitante.sql` de este
   repositorio, **copia todo su contenido** y pégalo en el editor.
3. Dale a **Run**. Si sale "Success. No rows returned", quedó.

### Para comprobar que quedó bien

Pega esto aparte y dale a Run:

```sql
select es_vitrina('demo')            as demo_es_vitrina,        -- true
       es_vitrina('demo-k3f9x2')     as vitrina_propia,          -- true
       es_vitrina('boda-perez')      as boda_real,               -- false
       emitir_pase('demo-k3f9x2') is not null as ya_tiene_pase,  -- true
       cupo_bytes_del_evento('demo-k3f9x2')   as cupo_bytes;     -- 26214400
```

Si `ya_tiene_pase` sale **true**, está listo. Las apps se dan cuenta solas: la
próxima vez que alguien abra una demo, estrenará su vitrina.

---

## Preguntas que te pueden surgir

**¿Esto puede afectar a una boda real?**
No. El prefijo `demo-` queda reservado para las vitrinas, y los eventos reales
que crea el panel no lo usan: viven en la tabla `events` y siguen entrando por
el camino de siempre, que esta migración no toca. Cada pase sigue firmado para
su evento, y la seguridad por evento sigue igual.

**¿Se va a llenar el almacenamiento con las visitas?**
Está previsto: una vitrina de visitante tiene un cupo **más bajo** que la
compartida (25 MB en vez de 150 MB) y admite menos subidas por hora (60 en vez
de 300). Detrás de cada vitrina hay una sola persona probando, así que sobra. El
texto de la demo son unos pocos KB por visitante.

**¿Y la vitrina vieja, la compartida?**
Sigue viva. Los enlaces y códigos QR que ya repartiste con `?e=demo` (o sin
nada) siguen funcionando igual que siempre.

**¿Qué pasa si alguien limpia su navegador?**
Estrena otra vitrina, vacía y con los ejemplos otra vez. Es una demostración: no
hay nada que perder.

**¿Se acumulan vitrinas viejas para siempre?**
Sí, y de momento se limpian a mano. Si algún día son muchas, esto las borra
junto con lo que contengan (déjalo para cuando haga falta):

```sql
-- Vitrinas de visitante sin nada nuevo en 30 días
delete from items
 where evento like 'demo-%'
   and evento not in (select evento from items where creado > now() - interval '30 days');
```
