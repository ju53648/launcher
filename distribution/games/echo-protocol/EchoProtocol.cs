using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Text;
using System.Windows.Forms;

namespace EchoProtocol
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new EchoForm());
        }
    }

    public class Scene
    {
        public string Id;
        public string Stage;
        public string Title;
        public string Location;
        public string Objective;
        public string TextNormal;
        public string TextShifted;
        public string QuoteNormal;
        public string QuoteShifted;
        public int WarningAt;
        public Choice[] Choices;
    }

    public class Choice
    {
        public string Id;
        public string Label;
        public string Hint;
        public string Next;
        public Effect[] Effects;
        public string RequiredFlag;
        public string ForbiddenFlag;
        public int MinInsight = 0;
        public int MinAccess = 0;
        public int MinIntegrity = 0;
        public int MinTrust = -3;
        public int MaxStress = 7;
        public string LockHint;
    }

    public class Effect
    {
        public string Type;
        public string Key;
        public bool BoolValue;
        public int IntValue;
        public string NoteType;
        public string NoteTitle;
        public string NoteText;
    }

    public class NoteItem
    {
        public string Type;
        public string SceneId;
        public string Title;
        public string Text;
    }

    public class CardPanel : Panel
    {
        public Color BorderColor = Color.FromArgb(50, 70, 104);
        public Color AccentColor = Color.FromArgb(95, 170, 235);
        public bool SceneBackdrop = false;
        public bool DenseBackdrop = false;
        public bool HeroGlow = false;

        public CardPanel()
        {
            DoubleBuffered = true;
            Padding = new Padding(18);
            BackColor = Color.FromArgb(8, 12, 21);
            Margin = new Padding(6);
        }

        protected override void OnPaintBackground(PaintEventArgs e)
        {
            Rectangle rect = ClientRectangle;
            if (rect.Width <= 0 || rect.Height <= 0) return;

            using (GraphicsPath path = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), 14))
            using (LinearGradientBrush brush = new LinearGradientBrush(
                rect,
                HeroGlow ? Color.FromArgb(27, 33, 47) : Color.FromArgb(13, 18, 30),
                HeroGlow ? Color.FromArgb(4, 7, 13) : Color.FromArgb(5, 8, 15),
                LinearGradientMode.ForwardDiagonal))
            {
                e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
                e.Graphics.FillPath(brush, path);
            }
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            if (SceneBackdrop)
            {
                PaintSceneBackdrop(e.Graphics);
            }
            else if (DenseBackdrop)
            {
                PaintDenseBackdrop(e.Graphics);
            }

            using (LinearGradientBrush top = new LinearGradientBrush(
                new Rectangle(0, 0, Math.Max(1, Width), Math.Max(1, Height / 2)),
                Color.FromArgb(28, Color.White),
                Color.FromArgb(0, Color.White),
                LinearGradientMode.Vertical))
            {
                e.Graphics.FillRectangle(top, 0, 0, Width, Math.Max(1, Height / 2));
            }

            if (HeroGlow)
            {
                using (GraphicsPath glowPath = new GraphicsPath())
                {
                    glowPath.AddEllipse(new Rectangle(Width / 8, -Height / 3, Width, Height));
                    using (PathGradientBrush glow = new PathGradientBrush(glowPath))
                    {
                        glow.CenterColor = Color.FromArgb(55, AccentColor);
                        glow.SurroundColors = new Color[] { Color.FromArgb(0, AccentColor) };
                        e.Graphics.FillRectangle(glow, ClientRectangle);
                    }
                }
            }

            using (GraphicsPath path = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), 14))
            using (Pen glow = new Pen(Color.FromArgb(70, AccentColor), 1f))
            using (Pen pen = new Pen(BorderColor, 1f))
            {
                e.Graphics.DrawPath(glow, path);
                e.Graphics.DrawPath(pen, path);
            }
        }

        protected override void OnResize(EventArgs eventargs)
        {
            base.OnResize(eventargs);
            if (Width > 0 && Height > 0)
            {
                using (GraphicsPath path = RoundedRect(new Rectangle(0, 0, Width, Height), 14))
                {
                    Region = new Region(path);
                }
            }
        }

        private GraphicsPath RoundedRect(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }

        private void PaintSceneBackdrop(Graphics graphics)
        {
            using (Pen grid = new Pen(Color.FromArgb(18, AccentColor), 1f))
            {
                for (int x = 28; x < Width; x += 56)
                {
                    graphics.DrawLine(grid, x, 0, x, Height);
                }
                for (int y = 28; y < Height; y += 56)
                {
                    graphics.DrawLine(grid, 0, y, Width, y);
                }
            }

            using (Pen line = new Pen(Color.FromArgb(58, 220, 94, 110), 1.4f))
            {
                Point[] route = new Point[]
                {
                    new Point(Math.Max(40, Width / 8), Math.Max(80, Height / 3)),
                    new Point(Math.Max(120, Width / 3), Math.Max(50, Height / 5)),
                    new Point(Math.Max(190, Width / 2), Math.Max(120, Height / 2)),
                    new Point(Math.Max(260, Width - 180), Math.Max(90, Height / 3)),
                    new Point(Math.Max(320, Width - 80), Math.Max(180, Height - 90))
                };
                graphics.DrawLines(line, route);
                for (int i = 0; i < route.Length; i++)
                {
                    using (SolidBrush dot = new SolidBrush(Color.FromArgb(125, AccentColor)))
                    {
                        graphics.FillEllipse(dot, route[i].X - 4, route[i].Y - 4, 8, 8);
                    }
                }
            }

            using (SolidBrush wash = new SolidBrush(Color.FromArgb(120, 5, 8, 15)))
            {
                graphics.FillRectangle(wash, ClientRectangle);
            }
        }

        private void PaintDenseBackdrop(Graphics graphics)
        {
            using (Pen grid = new Pen(Color.FromArgb(14, AccentColor), 1f))
            {
                for (int y = 20; y < Height; y += 20)
                {
                    graphics.DrawLine(grid, 0, y, Width, y);
                }
            }
        }
    }

    public class MeterBar : Control
    {
        private int _currentValue = 0;
        public int MaximumValue = 10;
        public Color FillColor = Color.FromArgb(92, 190, 140);

        public int CurrentValue
        {
            get { return _currentValue; }
            set
            {
                _currentValue = Math.Max(0, Math.Min(MaximumValue, value));
                Invalidate();
            }
        }

        public MeterBar()
        {
            DoubleBuffered = true;
            Height = 14;
            Width = 210;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            using (GraphicsPath path = RoundedRect(rect, Height / 2))
            using (LinearGradientBrush bg = new LinearGradientBrush(rect, Color.FromArgb(20, 28, 42), Color.FromArgb(4, 7, 13), LinearGradientMode.Vertical))
            using (Pen border = new Pen(Color.FromArgb(72, 104, 148)))
            {
                e.Graphics.FillPath(bg, path);
                e.Graphics.DrawPath(border, path);
            }

            int fillWidth = MaximumValue <= 0 ? 0 : (int)Math.Round((Width - 2) * (CurrentValue / (double)MaximumValue));
            if (fillWidth > 0)
            {
                Rectangle fill = new Rectangle(1, 1, Math.Max(1, fillWidth), Height - 2);
                using (GraphicsPath fillPath = RoundedRect(fill, Height / 2))
                using (LinearGradientBrush brush = new LinearGradientBrush(fill, FillColor, Color.FromArgb(240, 248, 235, 180), LinearGradientMode.Horizontal))
                {
                    e.Graphics.FillPath(brush, fillPath);
                }
            }

            using (Pen tick = new Pen(Color.FromArgb(44, 238, 243, 255), 1f))
            {
                for (int i = 1; i < MaximumValue; i++)
                {
                    int x = (int)Math.Round(i * (Width - 2) / (double)MaximumValue);
                    e.Graphics.DrawLine(tick, x, 4, x, Height - 5);
                }
            }
        }

        private GraphicsPath RoundedRect(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = Math.Max(2, radius * 2);
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    public class EchoButton : Button
    {
        public Color AccentColor = Color.FromArgb(95, 170, 235);
        public bool Important = false;

        public EchoButton()
        {
            FlatStyle = FlatStyle.Flat;
            FlatAppearance.BorderSize = 0;
            BackColor = Color.FromArgb(14, 20, 33);
            ForeColor = Color.FromArgb(238, 243, 255);
            DoubleBuffered = true;
        }

        protected override void OnPaint(PaintEventArgs pevent)
        {
            Graphics g = pevent.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            Rectangle rect = new Rectangle(0, 0, Width - 1, Height - 1);
            bool hot = ClientRectangle.Contains(PointToClient(Cursor.Position)) && Enabled;

            Color top = Enabled ? Color.FromArgb(hot ? 42 : 24, 38, 58) : Color.FromArgb(18, 18, 24);
            Color bottom = Enabled ? Color.FromArgb(hot ? 18 : 8, 14, 25) : Color.FromArgb(13, 13, 18);
            using (GraphicsPath path = RoundedRect(rect, 12))
            using (LinearGradientBrush bg = new LinearGradientBrush(rect, top, bottom, LinearGradientMode.Vertical))
            using (Pen border = new Pen(Enabled ? Color.FromArgb(hot ? 230 : 115, AccentColor) : Color.FromArgb(70, 70, 80), hot ? 1.6f : 1f))
            {
                g.FillPath(bg, path);
                if (hot || Important)
                {
                    using (GraphicsPath haloPath = RoundedRect(new Rectangle(2, 2, Width - 5, Height - 5), 11))
                    using (Pen halo = new Pen(Color.FromArgb(Important ? 105 : 70, AccentColor), 3f))
                    {
                        g.DrawPath(halo, haloPath);
                    }
                }
                g.DrawPath(border, path);
            }

            using (SolidBrush stripe = new SolidBrush(Color.FromArgb(Important ? 180 : 105, Important ? Color.FromArgb(240, 96, 112) : AccentColor)))
            {
                g.FillRectangle(stripe, 0, 8, 5, Height - 16);
            }

            TextFormatFlags flags = TextFormatFlags.Left | TextFormatFlags.VerticalCenter | TextFormatFlags.WordBreak | TextFormatFlags.EndEllipsis;
            Rectangle textRect = new Rectangle(18, 5, Width - 28, Height - 10);
            TextRenderer.DrawText(g, Text, Font, textRect, Enabled ? ForeColor : Color.FromArgb(145, 150, 166), flags);
        }

        private GraphicsPath RoundedRect(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    public class AccentLabel : Label
    {
        public AccentLabel()
        {
            BackColor = Color.Transparent;
            AutoSize = true;
        }
    }

    public class StyledTabControl : TabControl
    {
        public StyledTabControl()
        {
            DrawMode = TabDrawMode.OwnerDrawFixed;
            SizeMode = TabSizeMode.Fixed;
            ItemSize = new Size(82, 28);
        }

        protected override void OnDrawItem(DrawItemEventArgs e)
        {
            TabPage page = TabPages[e.Index];
            bool selected = SelectedIndex == e.Index;
            Rectangle rect = e.Bounds;
            Color bg = selected ? Color.FromArgb(19, 31, 49) : Color.FromArgb(8, 13, 22);
            Color border = selected ? Color.FromArgb(95, 170, 235) : Color.FromArgb(55, 70, 96);
            using (SolidBrush brush = new SolidBrush(bg))
            using (Pen pen = new Pen(border))
            {
                e.Graphics.FillRectangle(brush, rect);
                e.Graphics.DrawRectangle(pen, rect.X, rect.Y, rect.Width - 1, rect.Height - 1);
            }
            TextRenderer.DrawText(
                e.Graphics,
                page.Text,
                new Font("Segoe UI Semibold", 8.2f, FontStyle.Regular),
                rect,
                selected ? Color.FromArgb(238, 243, 255) : Color.FromArgb(158, 172, 202),
                TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter | TextFormatFlags.EndEllipsis);
        }
    }

    public class SceneStatusStrip : Panel
    {
        public string SceneId = "office";
        public int Score = 0;
        public int Decisions = 0;
        public int Shift = 0;

        public SceneStatusStrip()
        {
            DoubleBuffered = true;
            Height = 62;
            BackColor = Color.Transparent;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (GraphicsPath path = RoundedRect(new Rectangle(0, 0, Width - 1, Height - 1), 12))
            using (LinearGradientBrush bg = new LinearGradientBrush(ClientRectangle, Color.FromArgb(150, 9, 17, 29), Color.FromArgb(100, 3, 6, 11), LinearGradientMode.Vertical))
            using (Pen border = new Pen(Color.FromArgb(95, 95, 170, 235)))
            {
                e.Graphics.FillPath(bg, path);
                e.Graphics.DrawPath(border, path);
            }

            string[] items = new string[]
            {
                "SCENE " + SceneId.ToUpperInvariant(),
                "DECISIONS " + Decisions.ToString(),
                "SHIFT " + Shift.ToString() + "/7",
                "SCORE " + Score.ToString()
            };
            int x = 16;
            for (int i = 0; i < items.Length; i++)
            {
                Rectangle box = new Rectangle(x, 15, 156, 32);
                using (GraphicsPath pill = RoundedRect(box, 8))
                using (LinearGradientBrush accent = new LinearGradientBrush(box, Color.FromArgb(48, 95, 170, 235), Color.FromArgb(20, 245, 94, 112), LinearGradientMode.Horizontal))
                using (Pen pen = new Pen(Color.FromArgb(90, 95, 170, 235)))
                {
                    e.Graphics.FillPath(accent, pill);
                    e.Graphics.DrawPath(pen, pill);
                }
                TextRenderer.DrawText(e.Graphics, items[i], new Font("Consolas", 9f, FontStyle.Bold), box, Color.FromArgb(210, 230, 255), TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);
                x += 170;
            }
        }

        private GraphicsPath RoundedRect(Rectangle rect, int radius)
        {
            GraphicsPath path = new GraphicsPath();
            int diameter = radius * 2;
            path.AddArc(rect.X, rect.Y, diameter, diameter, 180, 90);
            path.AddArc(rect.Right - diameter, rect.Y, diameter, diameter, 270, 90);
            path.AddArc(rect.Right - diameter, rect.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(rect.X, rect.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            return path;
        }
    }

    public class NarrativePanel : Control
    {
        public string NarrativeText = "";
        public string QuoteText = "";
        public int Shift = 0;
        public int Stress = 0;
        public int Pulse = 0;

        public NarrativePanel()
        {
            DoubleBuffered = true;
            BackColor = Color.FromArgb(8, 12, 21);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.TextRenderingHint = System.Drawing.Text.TextRenderingHint.ClearTypeGridFit;

            PaintAtmosphere(e.Graphics);

            int x = 44;
            int y = 42;
            int maxWidth = Math.Max(360, (int)(Width * 0.66) - 70);
            float scale = Math.Max(0.92f, Math.Min(1.25f, Width / 1500f));
            using (Font mainFont = new Font("Georgia", 18.5f * scale, FontStyle.Regular))
            using (Font pulseFont = new Font("Georgia", 19.5f * scale, FontStyle.Bold))
            using (Font quoteFont = new Font("Georgia", 15.5f * scale, FontStyle.Italic))
            using (Font tinyFont = new Font("Consolas", 9f * scale, FontStyle.Bold))
            {
                string[] paragraphs = (NarrativeText ?? "").Replace("\r", "").Split('\n');
                for (int i = 0; i < paragraphs.Length; i++)
                {
                    string paragraph = paragraphs[i].Trim();
                    if (paragraph.Length == 0)
                    {
                        y += 18;
                        continue;
                    }

                    List<string> lines = WrapText(e.Graphics, paragraph, mainFont, maxWidth);
                    for (int j = 0; j < lines.Count; j++)
                    {
                        string line = lines[j];
                        Color color = LineColor(line);
                        Font font = IsHotLine(line) ? pulseFont : mainFont;
                        using (SolidBrush brush = new SolidBrush(color))
                        {
                            e.Graphics.DrawString(line, font, brush, x, y);
                        }
                        y += (int)(34 * scale);
                    }
                    y += (int)(10 * scale);
                }

                y = Math.Min(y + 8, Height - 142);
                Rectangle quoteRect = new Rectangle(x, Math.Max(y, Height - 128), Math.Min(maxWidth + 120, Width - 92), 84);
                using (SolidBrush quoteBg = new SolidBrush(Color.FromArgb(88, 56, 18, 26)))
                using (Pen quotePen = new Pen(Color.FromArgb(150, 245, 94, 112)))
                {
                    e.Graphics.FillRectangle(quoteBg, quoteRect);
                    e.Graphics.DrawRectangle(quotePen, quoteRect);
                    e.Graphics.FillRectangle(new SolidBrush(Color.FromArgb(210, 245, 94, 112)), quoteRect.X, quoteRect.Y, 4, quoteRect.Height);
                }

                string quote = QuoteText ?? "";
                if (Shift >= 3 && quote.Contains("du"))
                {
                    quote = quote.Replace("du", "ICH");
                }
                TextRenderer.DrawText(
                    e.Graphics,
                    quote,
                    quoteFont,
                    new Rectangle(quoteRect.X + 18, quoteRect.Y + 13, quoteRect.Width - 32, quoteRect.Height - 18),
                    Color.FromArgb(255, 200, 208),
                    TextFormatFlags.WordBreak | TextFormatFlags.Left | TextFormatFlags.VerticalCenter);

                string status = "RAIN / 02:13 / SIGNAL " + (Shift > 3 ? "UNSTABLE" : "LOW") + " / STRESS " + Stress.ToString();
                TextRenderer.DrawText(e.Graphics, status, tinyFont, new Rectangle(44, Height - 30, maxWidth, 20), Color.FromArgb(150, 190, 220, 255), TextFormatFlags.Left | TextFormatFlags.VerticalCenter);
            }
        }

        private void PaintAtmosphere(Graphics graphics)
        {
            Rectangle rect = ClientRectangle;
            using (LinearGradientBrush bg = new LinearGradientBrush(rect, Color.FromArgb(24, 27, 35), Color.FromArgb(3, 6, 11), LinearGradientMode.ForwardDiagonal))
            {
                graphics.FillRectangle(bg, rect);
            }

            using (GraphicsPath spotlightPath = new GraphicsPath())
            {
                spotlightPath.AddEllipse(new Rectangle(-Width / 4, -Height / 2, Width, Height + Height / 2));
                using (PathGradientBrush spotlight = new PathGradientBrush(spotlightPath))
                {
                    spotlight.CenterColor = Color.FromArgb(42, 150, 190, 235);
                    spotlight.SurroundColors = new Color[] { Color.FromArgb(0, 150, 190, 235) };
                    graphics.FillRectangle(spotlight, rect);
                }
            }

            using (Pen grid = new Pen(Color.FromArgb(15, 150, 190, 235), 1f))
            {
                for (int x = 0; x < Width; x += 34)
                {
                    graphics.DrawLine(grid, x, 0, x + 80, Height);
                }
                for (int y = 24; y < Height; y += 28)
                {
                    graphics.DrawLine(grid, 0, y, Width, y);
                }
            }

            using (Pen rain = new Pen(Color.FromArgb(28, 125, 186, 220), 1f))
            {
                int offset = (Pulse * 8) % 70;
                for (int x = -80; x < Width; x += 38)
                {
                    graphics.DrawLine(rain, x + offset, 0, x + offset + 110, Height);
                }
            }

            DrawEvidenceBoard(graphics);

            using (Pen scan = new Pen(Color.FromArgb(12, 255, 255, 255), 1f))
            {
                int scanOffset = Pulse % 5;
                for (int y = scanOffset; y < Height; y += 5)
                {
                    graphics.DrawLine(scan, 0, y, Width, y);
                }
            }

            using (SolidBrush red = new SolidBrush(Color.FromArgb(20 + (Pulse % 9) * 3, 245, 94, 112)))
            {
                graphics.FillRectangle(red, Width - 260, 0, 120, Height);
                graphics.FillRectangle(red, Width - 96, 0, 22, Height);
            }

            using (Pen evidence = new Pen(Color.FromArgb(52, 245, 205, 112), 1.2f))
            {
                graphics.DrawLine(evidence, Width - 340, 58, Width - 120, 136);
                graphics.DrawLine(evidence, Width - 320, Height - 120, Width - 80, 170);
                graphics.DrawLine(evidence, Width - 260, 92, Width - 150, Height - 90);
            }

            using (Font ghost = new Font("Impact", Math.Max(58f, Width / 17f), FontStyle.Regular))
            using (SolidBrush ghostBrush = new SolidBrush(Color.FromArgb(18, 238, 243, 255)))
            {
                graphics.DrawString("02:13", ghost, ghostBrush, Width - 470, Height - 190);
            }

            using (GraphicsPath vignette = new GraphicsPath())
            {
                vignette.AddEllipse(new Rectangle(-Width / 3, -Height / 2, Width + Width / 2, Height + Height));
                using (PathGradientBrush brush = new PathGradientBrush(vignette))
                {
                    brush.CenterColor = Color.FromArgb(0, 0, 0, 0);
                    brush.SurroundColors = new Color[] { Color.FromArgb(160, 0, 0, 0) };
                    graphics.FillRectangle(brush, rect);
                }
            }
        }

        private void DrawEvidenceBoard(Graphics graphics)
        {
            int cardW = Math.Max(170, Width / 8);
            int cardH = Math.Max(124, Height / 5);
            int baseX = Math.Max(Width - cardW - 76, (int)(Width * 0.72));
            int topY = 54;

            Point pinA = new Point(baseX + 30, topY + 24);
            Point pinB = new Point(Math.Min(Width - 76, baseX + cardW - 18), topY + cardH + 54);
            Point pinC = new Point(Math.Min(Width - 60, baseX + cardW - 4), Height - 180);
            using (Pen stringPen = new Pen(Color.FromArgb(130, 245, 94, 112), 2f))
            {
                graphics.DrawLine(stringPen, pinA, pinB);
                graphics.DrawLine(stringPen, pinB, pinC);
                graphics.DrawLine(stringPen, pinC, pinA);
            }

            DrawPhotoCard(graphics, new Rectangle(baseX, topY, cardW, cardH), "MIRA", "MISSING / DAY 11", -4f, Color.FromArgb(245, 205, 112));
            DrawPhotoCard(graphics, new Rectangle(baseX + 42, topY + cardH + 32, cardW - 18, cardH + 12), "E.V.", "LAST CONTACT", 5f, Color.FromArgb(245, 94, 112));
            DrawStamp(graphics, new Rectangle(baseX - 20, Height - 118, cardW + 72, 56), "DO NOT CLOSE");
        }

        private void DrawPhotoCard(Graphics graphics, Rectangle rect, string title, string subtitle, float angle, Color accent)
        {
            GraphicsState state = graphics.Save();
            graphics.TranslateTransform(rect.X + rect.Width / 2f, rect.Y + rect.Height / 2f);
            graphics.RotateTransform(angle);
            Rectangle local = new Rectangle(-rect.Width / 2, -rect.Height / 2, rect.Width, rect.Height);

            using (SolidBrush paper = new SolidBrush(Color.FromArgb(210, 228, 231, 226)))
            using (SolidBrush photo = new SolidBrush(Color.FromArgb(185, 10, 14, 22)))
            using (Pen border = new Pen(Color.FromArgb(180, accent), 2f))
            {
                graphics.FillRectangle(paper, local);
                graphics.FillRectangle(photo, local.X + 12, local.Y + 12, local.Width - 24, local.Height - 44);
                graphics.DrawRectangle(border, local.X + 12, local.Y + 12, local.Width - 24, local.Height - 44);
            }

            using (Pen silhouette = new Pen(Color.FromArgb(90, accent), 3f))
            {
                int center = local.X + local.Width / 2;
                graphics.DrawEllipse(silhouette, center - 18, local.Y + 34, 36, 36);
                graphics.DrawLine(silhouette, center, local.Y + 70, center - 34, local.Y + local.Height - 54);
                graphics.DrawLine(silhouette, center, local.Y + 70, center + 34, local.Y + local.Height - 54);
            }

            using (Font titleFont = new Font("Consolas", 12f, FontStyle.Bold))
            using (Font subFont = new Font("Consolas", 8.5f, FontStyle.Bold))
            using (SolidBrush titleBrush = new SolidBrush(Color.FromArgb(12, 16, 24)))
            using (SolidBrush subBrush = new SolidBrush(Color.FromArgb(92, 20, 32)))
            {
                graphics.DrawString(title, titleFont, titleBrush, local.X + 14, local.Bottom - 35);
                graphics.DrawString(subtitle, subFont, subBrush, local.X + 14, local.Bottom - 19);
            }

            graphics.Restore(state);
        }

        private void DrawStamp(Graphics graphics, Rectangle rect, string text)
        {
            GraphicsState state = graphics.Save();
            graphics.TranslateTransform(rect.X + rect.Width / 2f, rect.Y + rect.Height / 2f);
            graphics.RotateTransform(-5f);
            Rectangle local = new Rectangle(-rect.Width / 2, -rect.Height / 2, rect.Width, rect.Height);
            using (Pen pen = new Pen(Color.FromArgb(150, 245, 94, 112), 3f))
            using (Font stampFont = new Font("Impact", 20f, FontStyle.Regular))
            using (SolidBrush stampBrush = new SolidBrush(Color.FromArgb(150, 245, 94, 112)))
            using (StringFormat format = new StringFormat())
            {
                format.Alignment = StringAlignment.Center;
                format.LineAlignment = StringAlignment.Center;
                graphics.DrawRectangle(pen, local);
                graphics.DrawString(text, stampFont, stampBrush, local, format);
            }
            graphics.Restore(state);
        }

        private List<string> WrapText(Graphics graphics, string text, Font font, int maxWidth)
        {
            List<string> lines = new List<string>();
            string[] words = text.Split(' ');
            StringBuilder current = new StringBuilder();
            for (int i = 0; i < words.Length; i++)
            {
                string next = current.Length == 0 ? words[i] : current.ToString() + " " + words[i];
                if (graphics.MeasureString(next, font).Width > maxWidth && current.Length > 0)
                {
                    lines.Add(current.ToString());
                    current.Clear();
                    current.Append(words[i]);
                }
                else
                {
                    current.Clear();
                    current.Append(next);
                }
            }
            if (current.Length > 0) lines.Add(current.ToString());
            return lines;
        }

        private bool IsHotLine(string line)
        {
            string lower = line.ToLowerInvariant();
            return lower.Contains("du") || lower.Contains("ich") || lower.Contains("falsch") || lower.Contains("mira");
        }

        private Color LineColor(string line)
        {
            string lower = line.ToLowerInvariant();
            if (lower.Contains("du") || lower.Contains("ich")) return Color.FromArgb(255, 142, 156);
            if (lower.Contains("mira")) return Color.FromArgb(246, 214, 146);
            if (lower.Contains("falsch") || lower.Contains("immer")) return Color.FromArgb(127, 210, 255);
            if (line.StartsWith("Zu")) return Color.FromArgb(180, 195, 218);
            return Color.FromArgb(238, 243, 255);
        }
    }

    public class EchoForm : Form
    {
        private class IncomingMessage
        {
            public string Sender;
            public string Content;
            public bool IsRead;
        }

        private enum GameMode
        {
            Normal,
            Hard,
            Speedrun
        }

        private const int SlotCount = 8;
        private const int ArchiveDistrictCount = 16;
        private const int ArchiveCaseCount = 24;
        private const int ArchiveLayerCount = 4;

        private static readonly string SaveFolder = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Lumorix",
            "EchoProtocol",
            "saves"
        );

        private readonly Dictionary<string, Scene> _scenes = new Dictionary<string, Scene>();
        private readonly Dictionary<string, bool> _flags = new Dictionary<string, bool>();
        private readonly List<NoteItem> _notes = new List<NoteItem>();
        private readonly List<string> _decisions = new List<string>();
        private readonly List<Button> _choiceButtons = new List<Button>();

        private string _sceneId = "office";
        private int _shift = 0;
        private int _stress = 1;
        private int _trust = 0;
        private int _loop = 1;
        private int _insight = 0;
        private int _access = 0;
        private int _integrity = 8;
        private int _hours = 0;
        private int _score = 0;
        private int _activeSlot = 1;
        private bool _updatingSlots = false;
        private GameMode _gameMode = GameMode.Normal;
        private int _shiftTotalMinutes = 720;
        private int _shiftElapsedMinutes = 0;
        private int _comboCount = 0;

        private Label _stage = new Label();
        private Label _location = new Label();
        private Label _title = new Label();
        private Label _objective = new Label();
        private Label _warn = new Label();
        private Label _sceneText = new Label();
        private Label _quote = new Label();
        private Label _meta = new Label();
        private Label _signal = new Label();
        private Label _threadSummary = new Label();
        private Label _slotInfo = new Label();
        private Label _buildMark = new Label();
        private Label _modeDisplay = new Label();
        private Label _timeDisplay = new Label();
        private Label _messageDisplay = new Label();

        private FlowLayoutPanel _choices = new FlowLayoutPanel();
        private FlowLayoutPanel _caseTabs = new FlowLayoutPanel();
        private ComboBox _slotSelect = new ComboBox();
        private SceneStatusStrip _sceneStrip = new SceneStatusStrip();
        private NarrativePanel _narrative = new NarrativePanel();
        private RichTextBox _caseView = new RichTextBox();
        private Timer _motionTimer = new Timer();
        private Timer _clockTimer = new Timer();
        private readonly ToolTip _choicePreview = new ToolTip();
        private string _activeCaseTab = "clue";
        private readonly string _language = ResolveLauncherLanguage();
        private int _motionTick = 0;
        private readonly List<IncomingMessage> _messages = new List<IncomingMessage>();
        private readonly Dictionary<string, bool> _triggeredCombos = new Dictionary<string, bool>();
        private static readonly string[,] ContentReplacements = new string[,]
        {
            { "Akt ", "Act " },
            { "Ende / ", "Ending / " },
            { "Nachtschicht", "Night Shift" },
            { "Polizeibuero", "Police office" },
            { "Mordkommission", "Homicide unit" },
            { "Flur der Dienststelle", "Station hallway" },
            { "Dienststelle", "Station" },
            { "Archivzimmer", "Archive room" },
            { "Digitalarchiv", "Digital archive" },
            { "Funkraum", "Radio room" },
            { "Dunkelkammer", "Darkroom" },
            { "Asservatenraum", "Evidence room" },
            { "Forensik", "Forensics" },
            { "Wohnung", "Flat" },
            { "Wohnblock", "Residential block" },
            { "Treppenhaus", "Stairwell" },
            { "Klinik", "Clinic" },
            { "Leichenhalle", "Morgue" },
            { "Hafen", "Harbor" },
            { "Kuehlraum", "Cold room" },
            { "Maschinenraum", "Machine room" },
            { "Serverkern", "Server core" },
            { "Tonbandarchiv", "Tape archive" },
            { "Kontrollkonsole", "Control console" },
            { "Kontrollraum", "Control room" },
            { "Konfrontation", "Confrontation" },
            { "Entscheidung", "Decision" },
            { "Abstieg", "Descent" },
            { "Beobachtung", "Observation" },
            { "Aussenort", "External site" },
            { "Stillgelegter", "Decommissioned" },
            { "Buero", "Office" },
            { "Bueroschrank", "Office cabinet" },
            { "Bisherige Entscheidungen", "Decisions so far" },
            { "Entscheidungen", "Decisions" },
            { "Hinweise", "Clues" },
            { "Tagebuch", "Diary" },
            { "Fotos", "Photos" },
            { "Anomalien", "Anomalies" },
            { "Faehrten", "Leads" },
            { "Erfolge", "Achievements" },
            { "Schichtzeit", "Shift time" },
            { "Durchlauf", "Run" },
            { "Rang", "Rank" },
            { "Ziel", "Target" },
            { "Falltiefe", "Case depth" },
            { "Belastung", "Stress" },
            { "Vertrauen", "Trust" },
            { "Einsicht", "Insight" },
            { "Zugang", "Access" },
            { "Integritaet", "Integrity" },
            { "offen", "open" },
            { "aktiv", "active" },
            { "gespeichert", "saved" },
            { "leer", "empty" },
            { "noch nicht", "not yet" },
            { "Mehr Zugang noetig.", "More access required." },
            { "Mehr Einsicht noetig.", "More insight required." },
            { "Mehr Integritaet noetig.", "More integrity required." },
            { "Jonas vertraut dir nicht genug.", "Jonas does not trust you enough." },
            { "Belastung zu hoch.", "Stress too high." },
            { "Noch nicht verfuegbar.", "Not available yet." },
            { "Eine passende Spur fehlt.", "A matching lead is missing." },
            { "Gesperrt:", "Locked:" }
        };

        private MeterBar _shiftBar = new MeterBar();
        private MeterBar _stressBar = new MeterBar();
        private MeterBar _trustBar = new MeterBar();
        private MeterBar _insightBar = new MeterBar();
        private MeterBar _accessBar = new MeterBar();
        private MeterBar _integrityBar = new MeterBar();

        private Label _shiftValue = new Label();
        private Label _stressValue = new Label();
        private Label _trustValue = new Label();
        private Label _insightValue = new Label();
        private Label _accessValue = new Label();
        private Label _integrityValue = new Label();
        private Label _loopValue = new Label();

        private RichTextBox _clueBox = new RichTextBox();
        private RichTextBox _diaryBox = new RichTextBox();
        private RichTextBox _photoBox = new RichTextBox();
        private RichTextBox _anomalyBox = new RichTextBox();
        private RichTextBox _timelineBox = new RichTextBox();
        private RichTextBox _leadBox = new RichTextBox();
        private RichTextBox _achievementBox = new RichTextBox();

        public EchoForm()
        {
            Text = L("Echo Protocol // Atmosphere Build 0.6", "Echo Protocol // Atmosphere Build 0.6");
            StartPosition = FormStartPosition.CenterScreen;
            Size = new Size(1640, 980);
            MinimumSize = new Size(1360, 860);
            WindowState = FormWindowState.Maximized;
            BackColor = Color.FromArgb(3, 6, 11);
            ForeColor = Color.FromArgb(238, 243, 255);
            KeyPreview = true;

            SelectGameMode();

            BuildScenes();
            BuildUi();
            ResetState();
            LoadSlot(1);
            RefreshSlotSelector();
            Render();

            _motionTimer.Interval = 90;
            _motionTimer.Tick += delegate
            {
                _motionTick++;
                _narrative.Pulse = _motionTick;
                _narrative.Invalidate();
                if (_motionTick % 4 == 0)
                {
                    Invalidate();
                }
            };
            _motionTimer.Start();

            _clockTimer.Interval = 5000;
            _clockTimer.Tick += delegate { AdvanceClock(1); };
            _clockTimer.Start();

            _choicePreview.InitialDelay = 120;
            _choicePreview.ReshowDelay = 120;
            _choicePreview.AutoPopDelay = 9000;
            _choicePreview.ShowAlways = true;

            EnsureStartupMessages();

            KeyDown += HandleGlobalKeys;
        }

        protected override void OnPaintBackground(PaintEventArgs e)
        {
            Rectangle rect = ClientRectangle;
            using (LinearGradientBrush bg = new LinearGradientBrush(rect, Color.FromArgb(1, 3, 8), Color.FromArgb(18, 24, 34), LinearGradientMode.ForwardDiagonal))
            {
                e.Graphics.FillRectangle(bg, rect);
            }

            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            using (GraphicsPath haloPath = new GraphicsPath())
            {
                haloPath.AddEllipse(new Rectangle(rect.Width / 8, -rect.Height / 3, rect.Width / 2, rect.Height));
                using (PathGradientBrush halo = new PathGradientBrush(haloPath))
                {
                    halo.CenterColor = Color.FromArgb(35, 75, 150, 210);
                    halo.SurroundColors = new Color[] { Color.FromArgb(0, 75, 150, 210) };
                    e.Graphics.FillRectangle(halo, rect);
                }
            }

            using (Pen rain = new Pen(Color.FromArgb(18, 90, 170, 210), 1f))
            {
                int offset = (_motionTick * 7) % 90;
                for (int x = -rect.Height; x < rect.Width + rect.Height; x += 46)
                {
                    e.Graphics.DrawLine(rain, x + offset, 0, x + offset + 180, rect.Height);
                }
            }

            using (Pen cut = new Pen(Color.FromArgb(28, 245, 94, 112), 2f))
            {
                e.Graphics.DrawLine(cut, 0, rect.Height - 72, rect.Width, rect.Height - 130);
                e.Graphics.DrawLine(cut, rect.Width - 420, 0, rect.Width - 80, rect.Height);
            }

            using (Pen grid = new Pen(Color.FromArgb(10, 255, 255, 255), 1f))
            {
                for (int y = 32; y < rect.Height; y += 32)
                {
                    e.Graphics.DrawLine(grid, 0, y, rect.Width, y);
                }
            }

            using (SolidBrush vignette = new SolidBrush(Color.FromArgb(130, 0, 0, 0)))
            {
                e.Graphics.FillRectangle(vignette, 0, 0, rect.Width, 18);
                e.Graphics.FillRectangle(vignette, 0, rect.Height - 18, rect.Width, 18);
            }
        }

        private void BuildScenes()
        {
            AddScene("office", "Akt I / Nachtschicht", "Polizeibuero bei Nacht", "Mordkommission / 02:13 Uhr",
                "Waehle die erste Spur und lege fest, wie tief du in dieser Schicht graben willst.",
                "Regen haemmert gegen die Scheiben.\n\nZu laut.\nZu konstant.\n\nMiras Akte liegt auf deinem Tisch.\n\nZu sauber.\nZu duenn.\nZu falsch.\n\nDie Uhr zeigt 02:13.\n\nSie zeigt immer 02:13.",
                "Die Akte liegt wieder vor dir.\n\nDu hast sie weggeschlossen.\nDu hast den Schluessel behalten.\n\nTrotzdem liegt sie da.\n\nAm Rand steht deine Handschrift:\n\nNicht die erste Nacht.\nNicht der erste Elias.",
                "\"Mira Hartmann. 11 Tage vermisst. Letzter Kontakt: du.\"",
                "\"Wenn du das hier liest, bist du wieder am Anfang.\"",
                2,
                C("open", "Akte oeffnen", "Der offizielle Weg. Sicher. Kontrolliert. Genau deshalb falsch.", "file",
                    Flag("openedFile", true), Shift(1), Time(1), Note("clue", "Akte geoeffnet", "Der erste Ordner ist zu sauber fuer ein echtes Vermisstenverfahren.")),
                C("calllog", "Anrufliste pruefen", "Drei verpasste Anrufe. Einer kam nach deiner Schicht.", "call",
                    Stress(1), Time(1), Note("clue", "Verpasste Anrufe", "Drei verpasste Anrufe ohne Nummer zwischen 02:07 Uhr und 02:11 Uhr.")),
                C("wall", "Fotos neu ordnen", "Etwas stimmt nicht. Aber nur, wenn du genauer hinsiehst.", "records",
                    Insight(1), Time(1), Note("photo", "Foto 12 markiert", "Zwischen den Tatortbildern klebt eines, auf dem dein Schatten doppelt auftaucht.")),
                C("dispatch", "Funkraum betreten", "Jemand hat in dieser Nacht gesprochen. Niemand hat es abgeheftet.", "dispatch",
                    Access(1), Time(1), Note("clue", "Funkspur", "Die Funkzentrale fuehrt Mira zuletzt als 'aktiv', nicht als vermisst.")),
                C("deepArchive", "Deep Archive oeffnen", "Unter der Akte liegt etwas Groesseres. Etwas, das dich schon kennt.", "archiveHub",
                    Flag("enteredDeepArchive", true), Score(25), Time(1), Note("clue", "Deep Archive", "Unter der Fallakte liegt ein Index mit Hunderten verknuepften Echo-Akten."))
            );

            AddScene("file", "Akt I / Archiv", "Miras Akte", "Archivzimmer",
                "Trenne echte Beweise von nachtraeglich bereinigten Spuren.",
                "Die Akte ist duenn. Zwei Vernehmungen fehlen, und jede geschwaerzte Zeile zeigt auf denselben Nachmittag. Ein Zwischenblatt traegt keine Fallnummer, nur dein Kuerzel.",
                "Die Akte ist voller Notizen in deiner Handschrift. Jede Randbemerkung beginnt mit 'Nicht wieder vergessen'. Auf mehreren Seiten wurde dein Name nachtraeglich ueberstrichen.",
                "\"Wer hat diese Leerseiten genehmigt?\"",
                "\"Du warst schon einmal hier. Du hast selbst gestrichen.\"",
                2,
                C("photo", "Tatortfoto vergroessern", "Die Koerner im Hintergrund koennten mehr zeigen als die eigentliche Aufnahme.", "photo",
                    Shift(1), Insight(1), Time(1), Note("photo", "Foto #12", "Im Hintergrund steht eine Person mit deinem Mantel und Miras rotem Schal.")),
                C("margin", "Randnotizen vergleichen", "Andere Tinte. Gleiche Handschrift. Schlechteres Gewissen.", "diary",
                    Shift(1), Insight(1), Time(1), Note("diary", "Randnotiz", "Neben einem Zeugenprotokoll steht: 'E.V. nicht allein befragen.'")),
                C("lab", "Faserprobe ins Labor geben", "Ein alter Schal ist im Beutel, aber nicht im Inhaltsverzeichnis.", "evidenceLab",
                    Access(1), Time(2), Note("clue", "Beutel ohne Nummer", "Im Beutel liegt roter Stoff, der nach Hafenwasser riecht.")),
                RequireAccess(C("vault", "Versiegelten Anhang anfordern", "Der Anhang ist nicht geloescht, nur auf eine hoehere Ebene verschoben.", "archiveVault",
                    Access(1), Insight(1), Time(1), Note("clue", "Versiegelter Anhang", "Die Sperrmarke lautet: Echo-Protokoll / Beobachtung.")), 2, "Du brauchst mehr Systemzugang.")
            );

            AddScene("call", "Akt I / Flur", "Unbekannter Anruf", "Flur der Dienststelle",
                "Entscheide, ob du dem Signal zuhoerst, es technisch verfolgst oder dich entziehst.",
                "Das Telefon klingelt. Keine Nummer, nur statisches Rauschen. Der Flur ist leer, aber das Display zeigt eine interne Durchwahl aus dem Kellergeschoss.",
                "Das Telefon klingelt mit deiner eigenen Stimme: 'Leg diesmal nicht auf.' Zwischen dem Rauschen hoerst du zwei Atemrhythmen, einen davon kennst du.",
                "\"Leitung offen. Wer ist da?\"",
                "\"Elias, wenn du auflegst, verlierst du wieder den Anfang.\"",
                3,
                C("pickup", "Abheben und schweigen", "Lass die Gegenseite zuerst beweisen, dass sie dich kennt.", "interview",
                    Flag("heardCaller", true), Shift(1), Stress(1), Time(1), Note("clue", "Stimme am Telefon", "Der Anrufer kennt den Tatort, bevor du ihn nennst.")),
                C("trace", "Leitung rueckverfolgen", "Wenn das Signal echt ist, hinterlaesst es ein Muster im Hausnetz.", "soundLab",
                    Access(1), Insight(1), Time(2), Note("clue", "Leitungsweg", "Die Spur endet an einem abgeschalteten Untergeschosszugang.")),
                C("dispatch", "Funkraum gegenpruefen", "Die Durchwahl muss irgendwo als Stoerung auftauchen.", "dispatch",
                    Access(1), Time(1), Note("anomaly", "Funkstoerung", "Der Funkraum loggt dein Gespraech vier Minuten bevor du rangehst.")),
                C("ignore", "Klingeln ignorieren", "Kontrolle bewahren klingt klug. Bis das Geraeusch trotzdem bleibt.", "therapy",
                    Stress(2), Integrity(-1), Time(1), Note("anomaly", "Nachhall", "Das Klingeln hoert auf, aber in deinem Ohr laeuft es weiter."))
            );

            AddScene("records", "Akt II / Systemspuren", "Archivserver und Beweiswand", "Digitalarchiv / Raum B-7",
                "Verbinde Daten, Bewegungen und Luecken, bis eine belastbare Spur entsteht.",
                "Badge-Logs, Flurkameras und Lagerlisten laufen zusammen. Mira taucht an drei Orten zugleich auf. Einer davon ist dein eigener Zugang.",
                "Das System fuehrt einen Benutzer 'E.V./Echo' mit Rueckdatierungen ueber mehrere Monate. Jede Abfrage oeffnet dieselbe Datei: Untergeschoss Blindkammer.",
                "\"Daten luegen selten. Menschen schon.\"",
                "\"Wenn die Daten dich spiegeln, bist du Teil des Versuchs.\"",
                3,
                C("badges", "Badge-Logs mit Jonas abgleichen", "Wenn jemand dich deckt, kennt Jonas den Zeitstempel.", "interview",
                    Insight(1), Time(1), Note("clue", "Badge-Abweichung", "Dein Zugang war um 01:48 Uhr im Untergeschoss aktiv.")),
                C("cctv", "Kamera 17 laden", "Der Hafen taucht in mehreren geschwaerzten Berichten auf.", "warehouse",
                    Shift(1), Insight(1), Time(2), Note("photo", "Kamera 17", "Zwischen zwei Schwarzbildern steht Mira kurz im Hafenlager und sieht direkt in die Linse.")),
                C("cold", "Alten Fallcode suchen", "Die Nummer wiederholt sich in Faellen, die nie zusammengelegt wurden.", "oldCase",
                    Insight(1), Time(2), Note("clue", "Alter Fallcode", "Echo-Faelle wurden ueber Jahre als getrennte Vermisstenakten gefuehrt.")),
                RequireInsight(C("vault", "Archivkern entsperren", "Ein Muster aus Kameraausfaellen passt zum Passwortschema.", "archiveVault",
                    Access(2), Shift(1), Time(2), Note("clue", "Archivkern", "Der Kern nennt Mira nicht Opfer, sondern Ankerperson.")), 3, "Du brauchst mehr Einsicht in die Datenmuster.")
            );

            AddScene("dispatch", "Akt II / Funkraum", "Nachtschicht-Funk", "Leitstelle Nord",
                "Nutze den Funk, um Orte und Zeiten unabhaengig von der Akte zu pruefen.",
                "Die Leitstelle ist leer, aber alle Lampen stehen auf Empfang. Auf Kanal 4 laeuft ein altes Band, das jede Minute deinen Dienstnamen nennt.",
                "Die Leitstelle ist nicht leer. Auf jedem Monitor steht dieselbe Einsatzmeldung: 'Elias Voss am Tatort eingetroffen. Wieder.'",
                "\"Wer meldet mich, wenn ich selbst hier sitze?\"",
                "\"Du warst nie nur Ermittler. Du warst Ruecklaufpunkt.\"",
                3,
                C("harbor", "Hafenruf wiederholen", "Die Antwort vom Hafen ist schwach, aber real.", "warehouse",
                    Access(1), Time(1), Note("clue", "Hafenruf", "Hafenlager 17 bestaetigt einen stillen Alarm um 01:48 Uhr.")),
                C("neighbor", "Miras Nachbarin anfunken", "Eine alte Notrufleitung fuehrt zu Miras Wohnblock.", "neighbor",
                    Insight(1), Time(1), Note("clue", "Nachbarleitung", "Eine Nachbarin meldete Miras Wohnung dreimal, dann zog sie die Anzeige zurueck.")),
                C("bridge", "Stadtbruecke pruefen", "Die Funkkarte zeigt einen zweiten Endpunkt unter der Bruecke.", "bridge",
                    Time(2), Note("photo", "Brueckenbild", "Eine Verkehrskamera zeigt Miras Schal am Gelaender.")),
                RequireAccess(C("lift", "Dienstaufzug freischalten", "Die Leitstelle kann den Untergeschossaufzug remote oeffnen.", "basementLift",
                    Access(1), Stress(1), Time(1), Note("anomaly", "Aufzugcode", "Der Code akzeptiert deine alte Kennung ohne Rueckfrage.")), 2, "Du brauchst mehr Zugriff.")
            );

            AddScene("photo", "Akt II / Dunkelkammer", "Fotoanalyse", "Dunkelkammer",
                "Entscheide, ob du dem Bild glaubst oder deinem Schutzinstinkt.",
                "Mit jeder Vergroesserung wird klar: Im Hintergrund stehst du. Nicht nur zufaellig. Die Haltung ist zu vertraut, zu ruhig, zu nah an Mira.",
                "Mit jeder Vergroesserung wird klar: Du umarmst Mira im Hintergrund. Auf der Rueckseite steht von ihrer Hand: 'Falls Elias vergisst, zeig ihm dieses Bild zuerst.'",
                "\"Das ist mein Mantel. Oder jemand wollte, dass ich genau das denke.\"",
                "\"Du hast mich damals nicht verloren. Du hast mich abgegeben.\"",
                3,
                C("memory", "Erinnerungsfetzen zulassen", "Du gibst dem Bild das Recht, lauter zu sein als dein Protokoll.", "therapy",
                    Flag("followedMemory", true), Shift(1), Insight(2), Stress(1), Time(1), Note("diary", "Bildfetzen", "Miras Stimme sagt: 'Du hast versprochen, nach unten zu kommen.'")),
                C("fake", "Foto als Faelschung melden", "Ein offizieller Vermerk verschafft dir Luft. Fuer einen Moment.", "evidenceLab",
                    Integrity(1), Trust(-1), Time(1), Note("clue", "Manipulationsvermerk", "Du hast selbst den Begriff 'Moegliche Bildmanipulation' in den Bericht gesetzt.")),
                C("backprint", "Rueckseite scannen", "Vielleicht ist nicht das Foto die Botschaft, sondern wer es vorbereitet hat.", "miraFlat",
                    Insight(1), Time(1), Note("photo", "Rueckseitenfund", "Unter dem Barcode steht: 'Nicht an Jonas weitergeben.'"))
            );

            AddScene("diary", "Akt II / Asservatenraum", "Tagebuchseite", "Asservatenraum",
                "Die Seite will etwas ueber dich bestaetigen. Nimm sie an oder stoere das Muster.",
                "Miras Tagebuch beschreibt eine fremde Person namens E.V. Die Notizen handeln von Schichten, Ruecksetzpunkten und einem Protokoll fuer den Fall, dass Elias wieder leer ist.",
                "Miras Tagebuch beschreibt euch beide. Die Tinte ist frisch. Zwischen den Seiten steckt ein Dienstaufzugplan mit markierter Blindkammer und deinem Kuerzel neben dem Notausgang.",
                "\"E.V. beobachtet, wenn er sich selbst nicht mehr erkennt.\"",
                "\"Wenn Elias die Seite findet, ist der Durchlauf fast zu Ende.\"",
                4,
                C("secure", "Seite sichern", "Saubere Ermittlungsarbeit. Papier statt Stimmen.", "clinic",
                    Insight(1), Integrity(1), Time(1), Note("clue", "Seite gesichert", "Die Tagebuchseite verweist auf Hafenlager 17 als letzten realen Treffpunkt.")),
                C("pocket", "Seite einstecken", "Wenn die Notiz fuer dich geschrieben wurde, gehoert sie nicht ins Archiv zurueck.", "miraFlat",
                    Shift(1), Insight(1), Stress(1), Time(1), Note("diary", "Seite verschwunden", "Du steckst die Seite ein. Danach fehlen zwei Minuten aus deinem Gedaechtnis.")),
                C("leave", "Seite zuruecklassen", "Vielleicht testet dich jemand. Vielleicht du selbst.", "interview",
                    Stress(1), Time(1), Note("anomaly", "Rueckkehr", "Als du dich umdrehst, liegt die Seite offen auf der Stelle mit deinem Namen."))
            );

            AddScene("evidenceLab", "Akt II / Labor", "Forensik bei Stromausfall", "Labortrakt C",
                "Pruefe Materialspuren, ohne der Maschine alle Entscheidungen zu ueberlassen.",
                "Der Labortrakt arbeitet im Notlicht. Ein Analysegeraet listet rotes Textil, Hafenwasser, Hautpartikel und einen Zeitstempel, der eine Stunde in der Zukunft liegt.",
                "Das Analysegeraet druckt deinen Namen als Probenhalter. Unter 'Fundort' steht nicht Hafenlager, sondern Blindkammer.",
                "\"Das Labor hat keine Meinung. Genau deshalb macht es mir Angst.\"",
                "\"Probe E.V. ist nicht Spur, sondern Ursprung.\"",
                4,
                C("fiber", "Faserprobe vertiefen", "Der Schal koennte Miras letzte Bewegung zeigen.", "clinic",
                    Insight(1), Time(2), Note("clue", "Faserprofil", "Der Schal traegt Sediment vom Hafen und Desinfektionsmittel aus der Klinik.")),
                C("voice", "Tonspur isolieren", "Der Anruf hatte mehr Schichten als eine Stimme.", "soundLab",
                    Access(1), Insight(1), Time(2), Note("anomaly", "Zweite Stimme", "Unter dem Rauschen liegt dein Satz: 'Mira muss sich erinnern, nicht ich.'")),
                C("print", "Fingerabdruck gegenpruefen", "Der Abdruck ist zu sauber. Oder zu alt.", "oldCase",
                    Flag("labPrint", true), Insight(1), Time(1), Note("clue", "Abdruck", "Der Abdruck passt zu dir, aber die Datenbank nennt ihn zehn Jahre aelter."))
            );

            AddScene("soundLab", "Akt II / Tonanalyse", "Stimmen unter Rauschen", "Akustiklabor",
                "Trenne Anruf, Erinnerung und Aufzeichnung voneinander.",
                "Die Tonspur hat drei Ebenen: ein echter Anruf, ein altes Band und eine Stimme, die erst entsteht, wenn du die Datei rueckwaerts laufen laesst.",
                "Die Tonspur spricht dich nicht an. Sie korrigiert dich. Jedes Mal, wenn du pausierst, setzt sie einen Satz fort, den du noch nicht gesagt hast.",
                "\"Eine Stimme kann luegen. Drei Stimmen koennen ein Muster bilden.\"",
                "\"Rueckwaerts wird aus Hilfe eine Anweisung.\"",
                4,
                C("reverse", "Rueckwaertsfilter laufen lassen", "Nicht angenehm, aber wahrscheinlich noetig.", "radioTower",
                    Shift(1), Insight(2), Stress(1), Time(2), Note("anomaly", "Rueckwaertsfilter", "Die Datei sagt rueckwaerts: 'Der Turm sendet nur, wenn Elias zweifelt.'")),
                C("compare", "Mit alten Baendern vergleichen", "Echo-Protokolle hatten vielleicht schon fruehere Stimmen.", "tapeRoom",
                    Access(1), Insight(1), Time(2), Note("clue", "Tonvergleich", "Die Stimme am Telefon passt zu einem Band aus Lauf 08.")),
                RequireInsight(C("separate", "Miras Stimme freilegen", "Wenn du genug Muster kennst, bleibt eine echte Spur uebrig.", "safehouse",
                    Flag("heardMiraSignal", true), Integrity(1), Time(1), Note("diary", "Miras Signal", "Mira sagt: 'Wenn du mich suchst, such nicht nur den Keller. Such die Wohnung, die wir nie hatten.'")), 4, "Du brauchst mehr Einsicht.")
            );

            AddScene("miraFlat", "Akt II / Wohnung", "Miras leere Wohnung", "Wohnblock Sued / 4. Etage",
                "Lies den Ort, den die Akte wie eine Nebenbemerkung behandelt.",
                "Miras Wohnung ist zu ordentlich. Im Flur stehen zwei Paar Schuhe, aber nur eines ist in ihrer Groesse. Am Kuehlschrank klebt ein Foto von dir, halb abgerissen.",
                "Die Wohnung erkennt dich. Das Licht im Bad geht an, bevor du den Schalter beruehrst. Im Spiegel steht mit Lippenstift: 'Du hast hier gewohnt, bis du dich geloescht hast.'",
                "\"Warum steht mein Becher in ihrer Spuele?\"",
                "\"Ein Zuhause ist auch dann eine Spur, wenn niemand es zugibt.\"",
                4,
                C("neighbor", "Nachbarin befragen", "Sie hat etwas gesehen und danach gelernt zu schweigen.", "neighbor",
                    Trust(1), Insight(1), Time(1), Note("clue", "Nachbarin", "Die Nachbarin erkennt dich als den Mann, der Miras Wohnung nachts verlassen hat.")),
                C("safe", "Versteck hinter Heizkoerper pruefen", "Mira hat die Wand nicht sauber geschlossen.", "safehouse",
                    Access(1), Insight(1), Time(1), Note("diary", "Wohnungsversteck", "Hinter dem Heizkoerper liegt ein Schluessel mit rotem Faden.")),
                C("bath", "Badezimmerspiegel fotografieren", "Der Text koennte verschwinden, bevor jemand ihn sieht.", "photo",
                    Stress(1), Time(1), Note("photo", "Spiegeltext", "Im Foto ist der Lippenstifttext nicht auf dem Spiegel, sondern auf deiner Haut."))
            );

            AddScene("neighbor", "Akt II / Zeugin", "Frau Keller schweigt", "Wohnblock Sued / Treppenhaus",
                "Gewinne eine Zeugin, ohne sie in dieselbe Gefahr zu ziehen.",
                "Frau Keller oeffnet nur eine Kette breit. Sie sagt deinen Nachnamen, bevor du den Ausweis hebst. Dann blickt sie zur Kellertreppe, als hoere sie dort jemanden atmen.",
                "Frau Keller oeffnet gar nicht. Ihre Stimme kommt aus dem Treppenhauslautsprecher: 'Beim letzten Mal haben Sie mich gebeten, Ihnen nicht zu helfen.'",
                "\"Ich kenne Sie, Herr Voss. Das ist nicht gut fuer mich.\"",
                "\"Sie wollten, dass ich luege, wenn Sie wiederkommen.\"",
                4,
                C("gentle", "Ruhig bleiben und warten", "Manche Aussagen kommen erst, wenn du nicht drueckst.", "clinic",
                    Trust(1), Integrity(1), Time(1), Note("clue", "Zeugin beruhigt", "Frau Keller sah Mira mit einer Klinikmappe und deinem Dienstmantel.")),
                C("press", "Mit Dienstrecht Druck machen", "Schneller, aber teuer.", "warehouse",
                    Trust(-1), Stress(1), Integrity(-1), Time(1), Note("diary", "Zeugin unter Druck", "Frau Keller nennt Hafenlager 17 und schliesst dann endgueltig.")),
                RequireFlag(C("key", "Roten Schluessel zeigen", "Miras Versteck koennte ihr Vertrauen beweisen.", "safehouse",
                    Flag("neighborTrusted", true), Access(1), Time(1), Note("clue", "Zeugin oeffnet", "Der rote Schluessel gehoerte zu einer Ausweichwohnung am alten Bahnhof.")), "foundRedKey", "Du brauchst Miras roten Schluessel.")
            );

            AddScene("clinic", "Akt II / Klinikspur", "Station fuer Schlafmedizin", "Klinik St. Anselm",
                "Finde heraus, ob Miras Verschwinden als Krankheit getarnt wurde.",
                "Die Klinikakte nennt Mira nicht Patientin, sondern Begleitperson. Deine Unterschrift taucht auf drei Besuchsformularen auf, obwohl du nie hier gewesen sein willst.",
                "Die Stationsschwester spricht dich mit 'Doktor Voss' an. Auf der Tafel steht: 'Subjekt M stabilisiert Subjekt E.'",
                "\"Warum fuehlt sich dieses Wartezimmer wie ein Tatort an?\"",
                "\"Hier wurden nicht Traeume behandelt. Hier wurden sie sortiert.\"",
                4,
                C("therapy", "Therapieraum suchen", "Mira war hier nicht allein.", "therapy",
                    Insight(1), Time(1), Note("diary", "Therapieplan", "Der Plan beschreibt gemeinsame Sitzungen zwischen Mira und Elias.")),
                C("morgue", "Kellerarchiv der Klinik pruefen", "Nicht alle Klinikakten liegen oben.", "morgue",
                    Access(1), Stress(1), Time(2), Note("clue", "Klinikarchiv", "Eine Leichenhalle wurde als Aktenlager fuer Echo-Faelle genutzt.")),
                C("nurse", "Stationsschwester befragen", "Sie erkennt dich, aber nicht als Ermittler.", "interview",
                    Trust(1), Insight(1), Time(1), Note("clue", "Schwester Lenau", "Die Schwester sagt, Jonas habe nach jeder Ruecksetzung angerufen."))
            );

            AddScene("therapy", "Akt II / Erinnerung", "Therapieraum 3", "Klinik St. Anselm",
                "Pruefe, welche Erinnerung echt ist und welche nur als Schutz gebaut wurde.",
                "Im Therapieraum stehen zwei Stuehle und ein Aufnahmegeraet. Auf dem Band sagt Mira: 'Elias, du musst lernen, den Anfang zu misstrauen.'",
                "Auf dem zweiten Band weinst du. Du sagst: 'Wenn ich mich erinnere, werde ich es wieder tun.'",
                "\"Ich wollte Antworten. Ich bekomme Uebungen.\"",
                "\"Erinnerung ist hier kein Besitz. Sie ist Dosierung.\"",
                5,
                C("accept", "Erinnerung zulassen", "Mehr Wahrheit, weniger Stabilitaet.", "mirror",
                    Flag("acceptedMemory", true), Shift(2), Insight(2), Stress(1), Integrity(-1), Time(1), Note("diary", "Therapieband", "Du erinnerst dich an Miras Hand auf der Beobachtungsscheibe.")),
                C("resist", "Erinnerung technisch behandeln", "Du nimmst sie als Beweis, nicht als Identitaet.", "evidenceLab",
                    Integrity(1), Insight(1), Time(1), Note("clue", "Band gesichert", "Das Therapieband nennt eine Beobachtungsscheibe unter der Dienststelle.")),
                RequireIntegrity(C("ground", "Atemprotokoll befolgen", "Stabil bleiben, bevor du tiefer gehst.", "safehouse",
                    Stress(-2), Integrity(1), Time(1), Note("diary", "Atemprotokoll", "Miras Notiz hilft dir, die Schleife fuer Minuten zu verlangsamen.")), 5, "Deine Integritaet ist zu niedrig.")
            );

            AddScene("interview", "Akt III / Raum 4", "Verhoer: Jonas", "Spiegelraum / Dienststelle",
                "Jonas weiss mehr. Entscheide, ob du ihn bindest, zerdrueckst oder taeuschst.",
                "Jonas behauptet, Mira sei nur eine wichtige Zeugin gewesen. Er beobachtet jede deiner Pausen, als wuerde er auf eine bekannte Luecke warten.",
                "Jonas behauptet, Mira sei deine Partnerin gewesen. Dann korrigiert er sich nicht. Am Spiegelglas klebt ein alter Zettel mit deiner Schrift: 'Wenn Jonas luegt, schau nach unten.'",
                "\"Du siehst aus, als haettest du seit Tagen nicht geschlafen, Elias.\"",
                "\"Sag mir, ob du dich diesmal an den Keller erinnerst.\"",
                3,
                C("trust", "Jonas glauben", "Vertrauen kostet Kontrolle, kann aber Struktur bringen.", "jonasOffice",
                    Flag("trustedJonas", true), Trust(2), Time(1), Note("clue", "Jonas' Aussage", "Jonas bestaetigt, dass Mira zuletzt im Hafenlager 17 gesehen wurde.")),
                C("press", "Jonas unter Druck setzen", "Wenn er dich deckt, bricht der Druck zuerst an seiner Stimme.", "basementLift",
                    Flag("trustedJonas", false), Shift(1), Trust(-2), Stress(1), Time(1), Note("diary", "Verhoerdruck", "Jonas nennt die Blindkammer einen Ort, den du selbst angefordert hast.")),
                C("lie", "Ueber den Anruf luegen", "Ein Test. Wenn Jonas die Wahrheit kennt, verraet ihn die Reaktion.", "records",
                    Trust(-1), Insight(1), Time(1), Note("anomaly", "Jonas' Blick", "Jonas reagiert nicht auf deine Luege, sondern auf das Wort 'wieder'.")),
                RequireInsight(C("confront", "Echo-Protokoll direkt nennen", "Du bringst den Namen zu frueh auf den Tisch und zwingst ihn zur Seite.", "archiveVault",
                    Flag("jonasBroken", true), Access(2), Trust(-1), Time(1), Note("clue", "Jonas bricht", "Jonas gibt zu, dass die Akte nur die harmlose Version des Protokolls ist.")), 4, "Du brauchst mehr Einsicht, um ihn festzunageln.")
            );

            AddScene("jonasOffice", "Akt III / Jonas", "Jonas' Bueroschrank", "Dienststelle / Nebenflur",
                "Durchsuche den Raum eines Mannes, der sich viel zu gut auf dich vorbereitet hat.",
                "Jonas' Schrank ist ordentlich. Zu ordentlich. Hinter den Dienstplaenen liegen acht Umschlaege mit deinem Namen und unterschiedlichen Datumsstempeln.",
                "Alle Umschlaege tragen denselben Satz: 'Falls Elias mich wieder nicht erkennt, Akte B oeffnen.' Die neueste Version ist von heute.",
                "\"Jonas sammelt nicht Beweise. Er sammelt meine Fehlstarts.\"",
                "\"Freundschaft sieht anders aus. Schuld vielleicht genau so.\"",
                4,
                C("envelopes", "Umschlaege oeffnen", "Acht Versionen derselben Warnung.", "archiveVault",
                    Access(1), Insight(2), Time(2), Note("clue", "Akte B", "Jonas bewahrt acht Notfallversionen deiner eigenen Warnungen auf.")),
                C("badge", "Ersatzbadge nehmen", "Nicht schoen, aber der Keller fragt selten nach Moral.", "basementLift",
                    Flag("hasBadge", true), Access(2), Integrity(-1), Time(1), Note("anomaly", "Ersatzbadge", "Der Badge ist auf deinen alten Rang ausgestellt.")),
                C("callJonas", "Jonas zur Rede stellen", "Ein zweites Verhoer ohne Spiegelglas.", "interview",
                    Trust(-1), Stress(1), Time(1), Note("diary", "Jonas' Schuld", "Jonas sagt, er habe dich nicht gerettet, sondern verwaltet."))
            );

            AddScene("archiveVault", "Akt III / Archivkern", "Versiegelter Anhang", "Archivkern / Ebene -1",
                "Oeffne die Fallversion, die nicht fuer normale Ermittler gedacht war.",
                "Der Archivkern ist kalt und fensterlos. Im Register steht Mira unter 'Anker', du unter 'Ruecklauf', Jonas unter 'Stabilisator'.",
                "Das Register schreibt sich um, waehrend du liest. Unter deiner Rolle erscheint ein zweites Wort: 'Architekt'.",
                "\"Das ist keine Akte. Das ist eine Betriebsanleitung.\"",
                "\"Wenn ich Architekt bin, wer hat mich beauftragt?\"",
                4,
                C("old", "Fruehere Echo-Faelle lesen", "Die Schleife begann nicht mit Mira.", "oldCase",
                    Insight(2), Time(2), Note("clue", "Fruehere Echo-Faelle", "Vor Mira gab es vier Ankerpersonen und drei gescheiterte Ruecklaeufe.")),
                C("protocol", "Protokollschema kopieren", "Das Schema koennte spaetere Sperren oeffnen.", "protocolRoom",
                    Flag("foundProtocol", true), Access(2), Shift(1), Time(2), Note("clue", "Protokollschema", "Das Schema nennt eine Kontrollkonsole unter dem Spiegelraum.")),
                RequireAccess(C("lift", "Dienstaufzug zur Ebene -3 rufen", "Der Archivkern kennt einen tieferen Weg.", "basementLift",
                    Stress(1), Time(1), Note("anomaly", "Ebene -3", "Der Aufzug zeigt eine Ebene, die in keinem Bauplan steht.")), 4, "Der Archivkern verlangt mehr Zugang.")
            );

            AddScene("oldCase", "Akt III / Historie", "Der erste Echo-Fall", "Altaktenraum",
                "Finde heraus, wer vor Mira im Protokoll verschwand.",
                "Die Altakten sind in falschen Jahren abgelegt. Jede Mappe beschreibt eine Person, die nach einer Nacht an keinem Ort mehr korrekt erinnert wurde.",
                "Die Altakten tragen neue Fotos. Auf jedem siehst du im Hintergrund, aelter, juenger, nie ganz passend.",
                "\"Mira war nicht der Anfang. Sie war die erste, die zurueckgeschrieben hat.\"",
                "\"Ich bin in Akten, die vor meiner Laufbahn liegen.\"",
                5,
                C("morgue", "Aktenlager der Klinik pruefen", "Einige Tote wurden nie bestattet, nur umbenannt.", "morgue",
                    Insight(1), Stress(1), Time(2), Note("clue", "Umbenannte Tote", "Die Klinik ersetzte Namen durch Laufnummern.")),
                C("bridge", "Ersten Tatort aufsuchen", "Der erste Echo-Fall endete an der Stadtbruecke.", "bridge",
                    Time(2), Note("photo", "Erster Tatort", "Ein altes Brueckenfoto zeigt Mira Jahre vor ihrem offiziellen Umzug.")),
                C("tower", "Sendemuster vergleichen", "Alle Altfaelle haben dieselbe Funkstoerung.", "radioTower",
                    Insight(1), Access(1), Time(2), Note("anomaly", "Sendemuster", "Die Stoerung kommt vom stillgelegten Sendeturm am Rand der Stadt."))
            );

            AddScene("bridge", "Akt III / Aussenort", "Stadtbruecke im Regen", "Nordbruecke",
                "Pruefe den Ort, an dem die Schleife offenbar zuerst geatmet hat.",
                "Unter der Bruecke sammelt sich Wasser in Kreidekreisen. Jemand hat Miras Initialen in den Beton geritzt und daneben deine Dienstnummer.",
                "Die Kreidekreise laufen gegen den Regen. In der Pfuetze spiegelt sich nicht die Bruecke, sondern der Keller unter der Dienststelle.",
                "\"Wenn ein Ort alt genug ist, wirkt er wie ein Zeuge.\"",
                "\"Der erste Kreis war kein Tatort. Er war eine Probe.\"",
                4,
                C("collect", "Kreidereste sichern", "Material, das gegen Wasser arbeitet, gehoert ins Labor.", "evidenceLab",
                    Insight(1), Time(1), Note("clue", "Kreidereste", "Die Kreide enthaelt dasselbe Desinfektionsmittel wie der Klinikflur.")),
                C("follow", "Wasserlauf folgen", "Der Abfluss fuehrt nicht in die Kanalisation.", "tunnel",
                    Shift(1), Stress(1), Time(2), Note("anomaly", "Rueckwaertsregen", "Das Wasser laeuft zum Dienststellenkeller, nicht von ihm weg.")),
                C("call", "Brueckenfunk testen", "Der Ort reagiert auf Funkimpulse.", "radioTower",
                    Access(1), Time(1), Note("anomaly", "Brueckenfunk", "Deine Stimme kommt drei Sekunden vor deinem Ruf zurueck."))
            );

            AddScene("radioTower", "Akt III / Sendepunkt", "Stillgelegter Sendeturm", "Stadtrand / Antennenfeld",
                "Finde heraus, warum ein toter Turm noch deine Nacht sendet.",
                "Der Turm ist offiziell stromlos. Trotzdem vibrieren die Draehte im Wind und schreiben kurze Morsefolgen in den Regen.",
                "Die Antenne sendet deine Entscheidungen als Nummernfolge. Manche Nummern sind noch leer, als wuerde die Nacht auf spaetere Antworten warten.",
                "\"Ein Sender ohne Strom ist entweder kaputt oder ehrlich.\"",
                "\"Das Signal wartet auf Versionen von mir, die noch nicht existieren.\"",
                5,
                C("decode", "Morsefolge dekodieren", "Der Turm spricht in Szenen, nicht in Woertern.", "protocolRoom",
                    Insight(2), Access(1), Stress(1), Time(2), Note("clue", "Turmcode", "Der Turm nennt die Kontrollkonsole 'Schleusenherz'.")),
                C("broadcast", "Gegensignal senden", "Du machst dich hoerbar. Das kann helfen oder dich markieren.", "safehouse",
                    Shift(1), Integrity(-1), Time(1), Note("anomaly", "Gegensignal", "Nach deinem Signal taucht Miras Stimme in einer Ausweichwohnung auf.")),
                RequireInsight(C("silent", "Turm synchronisieren", "Wenn du genug Muster kennst, kannst du die Schleife kurz verlangsamen.", "controlDesk",
                    Flag("towerSynced", true), Integrity(2), Stress(-1), Time(1), Note("clue", "Turm synchronisiert", "Die Kontrollkonsole verliert fuer Sekunden ihre automatische Ruecksetzung.")), 6, "Du brauchst sehr viel Einsicht.")
            );

            AddScene("safehouse", "Akt III / Ausweichwohnung", "Wohnung am alten Bahnhof", "Bahnhof West / Leerstand",
                "Nutze Miras versteckten Raum, um dich vorzubereiten.",
                "Die Ausweichwohnung ist klein, aber bewohnt. Auf dem Tisch liegen Konservendosen, alte Stadtplaene und eine Liste mit Dingen, die du im naechsten Durchlauf behalten sollst.",
                "Die Wohnung ist voller Versionen dieser Liste. Jede hat andere Streichungen, aber alle enden mit demselben Satz: 'Elias muss diesmal selbst entscheiden.'",
                "\"Mira hat nicht nur Flucht geplant. Sie hat mich geplant.\"",
                "\"Eine sichere Wohnung ist nur sicher, solange die Schleife sie nicht liest.\"",
                4,
                C("key", "Roten Schluessel nehmen", "Ein kleiner Schluessel mit zu grosser Bedeutung.", "neighbor",
                    Flag("foundRedKey", true), Access(1), Time(1), Note("clue", "Roter Schluessel", "Der Schluessel passt zu keinem normalen Schloss der Wohnung.")),
                C("plan", "Miras Stadtplan studieren", "Ihre Markierungen zeigen Routen, nicht Orte.", "containerYard",
                    Insight(2), Time(2), Note("photo", "Stadtplan", "Die Route verbindet Wohnung, Hafen, Klinik und Dienststellenkeller ohne oeffentliche Strassen.")),
                C("rest", "Kurz stabilisieren", "Das kostet Zeit, aber gibt dir Boden unter den Fuessen.", "dispatch",
                    Stress(-2), Integrity(2), Time(2), Note("diary", "Kurze Ruhe", "Zum ersten Mal in dieser Nacht verliert das Echo kurz an Druck."))
            );

            AddScene("morgue", "Akt III / Klinikarchiv", "Leichenhalle ohne Tote", "Klinikkeller",
                "Pruefe, warum ein Archiv wie eine Leichenhalle gebaut wurde.",
                "Die Kuehlfaecher sind leer, aber jedes hat ein Namensschild. Manche Namen wurden abgekratzt, darunter stehen Laufnummern.",
                "Ein Fach oeffnet sich von innen. Darin liegt kein Koerper, sondern ein Tonband mit deinem Namen und Miras Blutgruppe.",
                "\"Hier wurden keine Menschen versteckt. Hier wurden Versionen abgelegt.\"",
                "\"Kalt genug, damit Erinnerung nicht weiter fault.\"",
                5,
                C("tape", "Band aus Fach E.V. sichern", "Du weisst, dass du es hoeren musst.", "tapeRoom",
                    Flag("hasMorgueTape", true), Insight(1), Stress(1), Time(1), Note("anomaly", "Fach E.V.", "Das Fach enthaelt ein Band mit deiner Stimme vor dem offiziellen Fallbeginn.")),
                C("records", "Kliniknummern abgleichen", "Die Laufnummern passen zu alten Echo-Faellen.", "oldCase",
                    Access(1), Insight(1), Time(1), Note("clue", "Laufnummern", "Die Nummern sind keine Patientenakten, sondern Durchlaufmarken.")),
                C("exit", "Wartungstuer nutzen", "Die Tuer fuehrt aus der Klinik und in den falschen Keller.", "tunnel",
                    Shift(1), Time(1), Note("anomaly", "Wartungstuer", "Die Tuer oeffnet direkt in einen Tunnel unter der Dienststelle."))
            );

            AddScene("warehouse", "Akt III / Hafen", "Rueckkehr zum Tatort", "Hafenlager 17",
                "Der Ort ist real. Deine Wahrnehmung vielleicht nicht mehr ganz.",
                "Das Lager ist leer. Nur Kreidemarkierungen auf dem Boden und ein umgekippter Stuhl unter einer flackernden Lampe.",
                "Das Lager ist nicht leer. Jemand hat deinen Namen an die Wand geschrieben und das E mehrfach durchgestrichen. Zwischen Paletten laeuft ein Tonband von selbst an.",
                "\"Hier endet jeder Bericht. Aber nichts hier fuehlt sich abgeschlossen an.\"",
                "\"Du warst schon hier, Elias. Du hast selbst abgeschlossen.\"",
                4,
                C("voices", "Den Stimmen folgen", "Die schnellste Richtung zu Mira. Auch die riskanteste.", "mira",
                    Flag("followedVoices", true), Shift(1), Stress(1), Time(1), Note("photo", "Polaroid aus Lager 17", "Auf dem Boden liegt ein frisches Polaroid: Elias betritt das Lager allein.")),
                C("backup", "Verstaerkung anfordern", "Wenn du das belegen willst, brauchst du Zeugen. Oder Funk, der nicht luegt.", "harborOffice",
                    Trust(1), Time(1), Note("clue", "Funkantwort", "Der Funk antwortet mit deiner eigenen Kennung und meldet das Lager als bereits geraeumt.")),
                C("freezer", "Kuehlraum durchsuchen", "Der kaelteste Raum fehlt in jedem Bericht.", "freezer",
                    Stress(1), Time(1), Note("anomaly", "Kuehlraum", "Hinter dem Kuehlraum fuehrt ein wartungsfreier Schacht direkt ins Untergeschoss.")),
                C("yard", "Containerliste pruefen", "Ein Container kam an, bevor Mira verschwand, und blieb offiziell leer.", "containerYard",
                    Access(1), Insight(1), Time(1), Note("clue", "Leerer Container", "Container M-17 wurde als leer gemeldet, obwohl er Strom zog."))
            );

            AddScene("freezer", "Akt III / Kuehlraum", "Kalte Markierungen", "Hafenlager 17 / Kuehlraum",
                "Untersuche den Raum, den alle Berichte auslassen.",
                "Der Kuehlraum ist trocken, obwohl draussen Wasser von der Decke tropft. An der Wand haengen Markierungen in roter Kreide.",
                "Dein Atem bildet Worte, bevor du sie denkst. 'Nicht oeffnen' steht auf der Innenseite einer Tuer, die es gestern nicht gab.",
                "\"Kaelte haelt Dinge fest. Auch Fehler.\"",
                "\"Hier hat jemand versucht, den Loop einzufrieren.\"",
                5,
                C("sample", "Rote Kreide sichern", "Dieselbe Farbe wie am Brueckenkreis.", "evidenceLab",
                    Insight(1), Time(1), Note("clue", "Rote Kreide", "Die Kreide enthaelt Metallspuren aus der Kontrollkonsole.")),
                C("shaft", "Wartungsschacht oeffnen", "Hinter der Wand liegt Luftzug.", "tunnel",
                    Access(1), Stress(1), Time(1), Note("anomaly", "Schacht", "Der Schacht fuehrt unter die Dienststelle, obwohl die Orte kilometerweit auseinander liegen.")),
                C("wait", "Kuehlung herunterfahren", "Riskant. Aber vielleicht taut etwas auf.", "containerYard",
                    Integrity(-1), Shift(1), Time(2), Note("diary", "Aufgetautes Foto", "Im Eis steckt ein Foto von Mira, auf dem sie dein Dienstabzeichen traegt."))
            );

            AddScene("containerYard", "Akt III / Hafen", "Container M-17", "Containerhof",
                "Finde heraus, was leer gemeldet wurde und trotzdem Strom zog.",
                "Container M-17 brummt leise. Das Schloss ist neu, der Rost alt. Innen riecht es nach Klinikflur und Hafenwasser.",
                "Im Container steht ein Stuhl aus dem Spiegelraum. Darauf liegt ein Zettel: 'Der Weg nach unten fuehrt nicht immer nach unten.'",
                "\"Ein leerer Container macht keine Geraeusche.\"",
                "\"Transport ist hier nur ein anderes Wort fuer Ruecksetzung.\"",
                5,
                C("open", "Schloss knacken", "Du verschaffst dir Antworten und hinterlaesst Spuren.", "harborOffice",
                    Access(1), Integrity(-1), Time(1), Note("clue", "Containerinhalt", "Im Container liegt Ausruestung aus der Blindkammer.")),
                C("route", "Lieferroute rekonstruieren", "Der Container fuhr Orte an, die offiziell nichts verbinden.", "bridge",
                    Insight(1), Time(2), Note("clue", "Lieferroute", "Die Route verbindet Klinik, Bruecke, Hafen und Dienststelle in exakt 47 Minuten.")),
                C("inside", "Im Container warten", "Manchmal zeigt sich eine Schleife erst, wenn man sie nicht draengt.", "redRoom",
                    Shift(1), Stress(1), Time(2), Note("anomaly", "Containerfahrt", "Als du die Tuer oeffnest, stehst du in rotem Notlicht."))
            );

            AddScene("harborOffice", "Akt III / Hafenverwaltung", "Buerofenster zum Wasser", "Hafenbuero",
                "Erweitere den Tatort um Verwaltung, Routen und stille Alarme.",
                "Das Hafenbuero fuehrt Lager 17 als leer, aber der Stromzaehler sagt etwas anderes. Neben dem Terminal klebt ein Foto von Mira mit ausgeschnittenem Hintergrund.",
                "Das Terminal zeigt deine Dienstkennung als Hafenmitarbeiter. Deine Unterschrift bestaetigt eine Lieferung, die erst morgen eintreffen soll.",
                "\"Verwaltung ist oft der sauberste Tatort.\"",
                "\"Papier kennt mich besser, als ich mich kenne.\"",
                4,
                C("manifest", "Liefermanifest sichern", "Der Container wurde nie wirklich leer.", "containerYard",
                    Access(1), Insight(1), Time(1), Note("clue", "Liefermanifest", "M-17 transportierte eine mobile Beobachtungseinheit.")),
                C("alarm", "Stillen Alarm pruefen", "Jemand rief Hilfe, ohne Polizei zu rufen.", "dispatch",
                    Time(1), Note("clue", "Stiller Alarm", "Der Alarm ging zuerst an Jonas' Privatnummer.")),
                C("tunnel", "Wartungskarte nehmen", "Die Karte kennt einen Tunnel unter der Stadt.", "tunnel",
                    Flag("hasTunnelMap", true), Access(1), Time(1), Note("photo", "Wartungskarte", "Die Karte verbindet Hafenlager und Dienststelle ueber alte Versorgungsschaechte."))
            );

            AddScene("basementLift", "Akt IV / Abstieg", "Dienstaufzug Ebene -3", "Dienststelle / alter Aufzug",
                "Steige in den Teil des Hauses, den niemand im Plan fuehrt.",
                "Der Aufzug riecht nach kaltem Metall. Die Etagenanzeige springt von -1 auf -3 und dann auf ein Symbol, das nicht zur Dienststelle gehoert.",
                "Die Anzeige zeigt nicht Etagen, sondern deine bisherigen Entscheidungen. Einige Felder sind leer, obwohl du sie noch nie gesehen hast.",
                "\"Ein Aufzug sollte Orte verbinden, nicht Versionen.\"",
                "\"Ebene -3 ist kein Stockwerk. Es ist ein Zustand.\"",
                4,
                C("boiler", "Zum Maschinenraum", "Waerme bedeutet hier nicht Sicherheit.", "boiler",
                    Stress(1), Time(1), Note("anomaly", "Maschinenraum", "Der Aufzug oeffnet zu Rohren, die wie Tonbandspulen beschriftet sind.")),
                C("server", "Zum Serverkern", "Wenn etwas ruecksetzt, muss es irgendwo rechnen.", "serverCore",
                    Access(1), Time(1), Note("clue", "Serverzugang", "Der Serverkern akzeptiert nur Dienstkennungen aus geloeschten Schichten.")),
                C("mirror", "Zum Spiegelraum", "Die alte Beobachtungsscheibe wartet unten.", "mirror",
                    Shift(1), Time(1), Note("anomaly", "Spiegelziel", "Der Aufzug oeffnet direkt hinter dem Verhoerspiegel."))
            );

            AddScene("tunnel", "Akt IV / Versorgung", "Wartungsschacht", "Unterstadt / Blindkammer-Zugang",
                "Unten liegt die Fallversion, die nie im offiziellen Protokoll stand.",
                "Der Schacht riecht nach kaltem Metall und altem Regen. Jemand hat Leitungen mit roter Kreide markiert, als haette er einen Weg fuer spaetere Rueckkehr gelegt.",
                "Im Schacht haengen Kopien deiner Ausweise an Kabelbindern. Aus der Tiefe hoerst du Mira und deine eigene Stimme, nicht ganz synchron.",
                "\"Nicht fuer den Dienstbetrieb freigegeben.\"",
                "\"Nicht fuer den ersten Durchlauf vorgesehen.\"",
                4,
                C("descend", "Weiter hinabsteigen", "Wenn du jetzt stoppst, bleibt alles Verdacht.", "mirror",
                    Shift(1), Stress(1), Time(1), Note("clue", "Abstieg", "Die Leitungen fuehren direkt in eine Beobachtungskammer unter der Dienststelle.")),
                C("boiler", "Rohren folgen", "Die roten Markierungen enden im Maschinenraum.", "boiler",
                    Time(1), Note("photo", "Rote Markierung", "Die Markierungen zaehlen nicht Meter, sondern Durchlaeufe.")),
                RequireFlag(C("map", "Wartungskarte ausnutzen", "Mit der Karte kannst du den Serverkern umgehen.", "serverCore",
                    Access(1), Integrity(1), Time(1), Note("clue", "Kartenvorteil", "Die Karte fuehrt zu einer Servicekonsole hinter dem Serverkern.")), "hasTunnelMap", "Du brauchst die Wartungskarte aus dem Hafenbuero.")
            );

            AddScene("boiler", "Akt IV / Maschinen", "Maschinenraum", "Ebene -3 / Heizkreis",
                "Stoere die Anlage, ohne sie sofort gegen dich zu wenden.",
                "Der Maschinenraum arbeitet ohne Personal. Rohre pochen wie ein Herz, und jedes Ventil traegt ein Namensschild aus einem alten Fall.",
                "Ein Ventil traegt deinen Namen. Wenn du dich naeherst, faengt es an zu singen: eine Kinderstimme, Miras Stimme, deine Stimme.",
                "\"Diese Anlage lebt nicht. Sie wiederholt.\"",
                "\"Wenn mein Name ein Ventil ist, bin ich Teil des Drucks.\"",
                5,
                C("cool", "Druck senken", "Stabiler, aber langsamer.", "serverCore",
                    Stress(-1), Integrity(1), Time(2), Note("clue", "Druck gesenkt", "Die Anlage verliert kurz genug Druck, um Serverdaten zu lesen.")),
                C("overload", "Ventil ueberlasten", "Gewaltsam, schnell und laut.", "redRoom",
                    Shift(1), Stress(2), Integrity(-2), Time(1), Note("anomaly", "Ueberlastung", "Das Ventil schreit mit deiner Stimme und oeffnet eine rote Tuer.")),
                C("listen", "Rohrschlag mitschreiben", "Der Rhythmus ist ein Code.", "soundLab",
                    Insight(2), Time(2), Note("clue", "Rohrcode", "Der Rhythmus entspricht den Funkpausen des Sendeturms."))
            );

            AddScene("serverCore", "Akt IV / Technik", "Serverkern", "Ebene -3 / Datenraum",
                "Finde heraus, was die Schleife speichert und was sie absichtlich verliert.",
                "Der Serverkern ist alt, aber die Daten sind von heute. Jeder Durchlauf hat ein Protokoll, nur die ersten drei wurden geloescht.",
                "Der Server zeigt eine Liveakte mit deinem Blickwinkel. Wenn du blinzelst, springt die Aufnahme drei Frames voraus.",
                "\"Maschinen vergessen nicht. Sie entscheiden nur, was sie anzeigen.\"",
                "\"Der Server sieht durch mich hindurch und nennt das Beweissicherung.\"",
                5,
                C("logs", "Ruecksetzlogs exportieren", "Endlich harte Beweise. Wenn du sie behalten kannst.", "controlDesk",
                    Flag("hasResetLogs", true), Access(1), Insight(2), Time(2), Note("clue", "Ruecksetzlogs", "Die Logs beweisen mindestens acht Durchlaeufe und Jonas' externe Freigaben.")),
                C("delete", "Eigene Beobachtungsdaten loeschen", "Weniger Kontrolle fuer die Anlage, weniger Beweis fuer dich.", "endingErase",
                    Integrity(-1), Shift(1), Time(1), Note("anomaly", "Selbstloeschung vorbereitet", "Der Server loescht deine Rollenbeschreibung, aber nicht deine Entscheidungen.")),
                RequireAccess(C("root", "Root-Konsole oeffnen", "Der Kern kann die Kontrollkonsole freigeben.", "protocolRoom",
                    Flag("rootAccess", true), Access(2), Stress(1), Time(1), Note("clue", "Root-Konsole", "Die Konsole akzeptiert dich nicht als Ermittler, sondern als Gruender.")), 5, "Du brauchst mehr Zugang.")
            );

            AddScene("mirror", "Akt IV / Beobachtung", "Beobachtungskammer", "Spiegelglas / Blindkammer",
                "Hier kollidieren Bericht, Experiment und Erinnerung.",
                "Hinter dem Spiegelglas steht ein alter Beobachtungsraum. Auf den Tischen liegen Kassetten, Formularstapel und Fotos von dir aus verschiedenen Schichten derselben Nacht.",
                "Auf dem Hauptmonitor laeuft eine Aufnahme von dir, wie du Mira in genau diesen Raum bringst. Unter dem Video steht: 'Echo-Protokoll, Lauf 08, Verantwortung: Voss.'",
                "\"Wer beobachtet hier wen?\"",
                "\"Du hast das Protokoll nicht geerbt. Du hast es gestartet.\"",
                5,
                C("play", "Bandgeraet starten", "Wenn die Aufnahme echt ist, gibt es kein unbeteiligtes Zurueck mehr.", "tapeRoom",
                    Flag("heardTape", true), Shift(1), Insight(2), Stress(1), Time(1), Note("clue", "Band 08", "Die Aufnahme nennt dich Betreuer des Echo-Protokolls.")),
                C("mira", "Rotes Notlicht folgen", "Mira ist nah, oder die Schleife kann sie gut imitieren.", "mira",
                    Shift(1), Time(1), Note("anomaly", "Rotes Notlicht", "Das Licht pulsiert immer dann, wenn du Miras Namen denkst.")),
                C("break", "Spiegelglas einschlagen", "Du zerstoerst die Kammer, aber vielleicht nur den Beweis deiner Rolle.", "endingLoop",
                    Shift(1), Stress(2), Integrity(-2), Time(1), Note("anomaly", "Scherbenbild", "In den Splittern siehst du mehrere Versionen derselben Nacht.")),
                RequireFlag(C("logs", "Ruecksetzlogs gegen Aufnahme halten", "Wenn Bild und Log zusammenpassen, bleibt wenig Raum fuer Ausreden.", "protocolRoom",
                    Insight(2), Time(1), Note("clue", "Abgleich", "Die Aufnahme ist echt. Die Logs zeigen, dass Mira die einzige war, die Ruecksetzungen stoeren konnte.")), "hasResetLogs", "Du brauchst die Ruecksetzlogs aus dem Serverkern.")
            );

            AddScene("tapeRoom", "Akt IV / Baender", "Tonbandarchiv", "Blindkammer / Regalgang",
                "Hoere genug, um den naechsten Schritt zu verstehen, ohne dich vollstaendig zu verlieren.",
                "Das Tonbandarchiv ist laenger als der Raum. Jedes Band ist mit einer Nummer, einem Namen und einer kurzen Entschuldigung beschriftet.",
                "Die Regale verschieben sich, bis nur noch Baender mit deinem Namen uebrig sind. Eines davon ist noch warm.",
                "\"Wer so viele Entschuldigungen braucht, wusste, was er tut.\"",
                "\"Ich habe mir selbst Beweise hinterlassen und gehofft, sie nie zu brauchen.\"",
                5,
                C("morgueTape", "Band aus Fach E.V. hoeren", "Das Band wurde fuer diesen Moment versteckt.", "protocolRoom",
                    Flag("heardMorgueTape", true), Insight(2), Stress(1), Time(1), Note("diary", "Fachband", "Deine Stimme sagt: 'Mira darf nicht der Preis fuer meine Stabilitaet sein.'")),
                C("miraTape", "Miras Band suchen", "Ihr Name wurde aus dem Register entfernt, nicht aus dem Raum.", "mira",
                    Insight(1), Time(1), Note("diary", "Miras Band", "Mira sagt: 'Wenn du mich findest, frag nicht, wo ich war. Frag, wer dich geschickt hat.'")),
                RequireInsight(C("splice", "Baender schneiden und neu ordnen", "Du stellst einen Gegenbeweis aus Fragmenten her.", "controlDesk",
                    Flag("counterTape", true), Integrity(1), Time(2), Note("clue", "Gegenband", "Das neue Band beweist, dass die Anlage Erinnerungen nur teilweise kontrolliert.")), 5, "Du brauchst mehr Einsicht.")
            );

            AddScene("protocolRoom", "Akt V / Kern", "Echo-Protokoll", "Kontrollraum / Schleusenherz",
                "Verstehe, ob das Protokoll Mira sucht, schuetzt oder benutzt.",
                "Der Kontrollraum ist klein, fast enttaeuschend. Drei Monitore zeigen Mira, dich und einen leeren Stuhl. Der leere Stuhl ist mit 'naechste Version' beschriftet.",
                "Der dritte Monitor zeigt bereits dich im Stuhl. Unter dem Bild steht: 'Elias Voss, Architekt, Ruecklaufpunkt, Risiko.'",
                "\"Das Zentrum sieht nicht aus wie Macht. Es sieht aus wie Verwaltung.\"",
                "\"Der leere Stuhl war nie leer. Er hat nur auf mich gewartet.\"",
                6,
                C("desk", "Kontrollkonsole pruefen", "Hier werden Ruecksetzungen nicht nur beobachtet, sondern gestartet.", "controlDesk",
                    Access(1), Insight(1), Time(1), Note("clue", "Kontrollkonsole", "Die Konsole bietet Containment, Loeschung und Offenlegung als aktive Optionen an.")),
                C("red", "Rote Tuer oeffnen", "Mira ist hinter der Tuer, oder die letzte Schutzschicht.", "redRoom",
                    Shift(1), Stress(1), Time(1), Note("anomaly", "Rote Tuer", "Die Tuer oeffnet nur, nachdem du deinen Namen laut sagst.")),
                RequireFlag(C("counter", "Gegenband einspeisen", "Das Gegenband koennte Miras Erinnerung vom Protokoll loesen.", "mira",
                    Flag("miraCanLeave", true), Integrity(1), Time(1), Note("clue", "Gegenband eingespeist", "Miras Erinnerung wird nicht mehr automatisch in den Ruecklauf gezogen.")), "counterTape", "Du brauchst ein Gegenband aus dem Tonbandarchiv."),
                RequireFlag(C("root", "Root-Zugriff einsetzen", "Du kannst das Protokoll jetzt als Betreiber veraendern.", "controlDesk",
                    Flag("operatorMode", true), Access(1), Stress(1), Time(1), Note("anomaly", "Betreibermodus", "Die Anlage begruesst dich als Gruender und fragt nach der naechsten Regel.")), "rootAccess", "Du brauchst Root-Zugriff aus dem Serverkern.")
            );

            AddScene("redRoom", "Akt V / Konfrontation", "Roter Raum", "Blindkammer / Notlicht",
                "Der Raum zwingt dich, die Kosten jeder Wahrheit zu sehen.",
                "Im roten Raum steht nur ein Stuhl. Darauf liegt Miras Schal. Der Stoff ist trocken, aber darunter bildet sich eine Pfuetze.",
                "Der Schal liegt auf deinem Dienstabzeichen. Mira steht hinter dir, nicht als Erscheinung, sondern als jemand, der entschieden hat, keine Angst mehr vor dir zu haben.",
                "\"Manche Raeume sind nicht verschlossen. Sie warten nur, bis du schuldig genug bist.\"",
                "\"Du hast nicht alles getan. Aber du hast genug zugelassen.\"",
                6,
                C("mira", "Mira gegenuebertreten", "Keine Akte mehr zwischen euch.", "mira",
                    Shift(1), Insight(1), Time(1), Note("diary", "Roter Raum", "Mira fragt nicht, ob du sie rettest. Sie fragt, ob du diesmal aufhoerst.")),
                C("contain", "Raum versiegeln", "Du rettest vielleicht die Stadt und sperrst vielleicht Mira ein.", "endingContain",
                    Integrity(-1), Trust(-1), Time(1), Note("clue", "Versiegelung", "Die Anlage bietet eine Eindaemmung an, die Miras Ankerrolle einfriert.")),
                C("erase", "Notloeschung ausloesen", "Alles beenden, auch das, was dich noch erklaeren koennte.", "endingErase",
                    Shift(1), Integrity(-2), Time(1), Note("anomaly", "Notloeschung", "Der Raum nimmt deinen Fingerabdruck an, bevor du ihn auflegst."))
            );

            AddScene("controlDesk", "Akt V / Entscheidung", "Kontrollkonsole", "Schleusenherz",
                "Du hast Zugriff. Das macht die Entscheidung nicht leichter.",
                "Die Konsole zeigt vier Wege: Offenlegung, Containment, Loeschung und Ruecklauf. Jeder Weg hat einen Preis, aber nur einer laesst Mira eine echte Stimme.",
                "Die Konsole zeigt fuenf Wege. Der fuenfte ist mit deinem Namen beschriftet und blinkt nur, wenn du nicht hinsiehst.",
                "\"Eine Konsole ist nur ehrlich, wenn sie auch den Preis anzeigt.\"",
                "\"Macht ist hier ein Formular mit meiner Unterschrift.\"",
                6,
                RequireFlag(C("truth", "Alles offenlegen", "Logs, Baender und Miras Aussage werden Teil einer oeffentlichen Akte.", "endingTruth",
                    LoopDelta(1), Time(1), Note("clue", "Offenlegung", "Die Fallakte wird groesser als das Protokoll sie halten kann.")), "hasResetLogs", "Du brauchst Ruecksetzlogs als Beweis."),
                C("contain", "Schleife kontrolliert eindaemmen", "Eine pragmatische Loesung, wenn du den Kollaps fuerchtest.", "endingContain",
                    LoopDelta(1), Integrity(1), Time(1), Note("clue", "Containment", "Die Schleife bleibt lokal, aber Mira bleibt Anker.")),
                C("erase", "Protokoll loeschen", "Du beendest die Maschine und riskierst jede Erinnerung daran.", "endingErase",
                    LoopDelta(1), Shift(-2), Integrity(-2), Time(1), Note("anomaly", "Loeschbefehl", "Die Maschine fragt, ob Elias Voss ebenfalls entfernt werden soll.")),
                C("loop", "Ruecklauf absichtlich starten", "Ein neuer Durchlauf mit mehr Wissen, aber auch mehr Echo.", "endingLoop",
                    LoopDelta(1), Shift(1), Time(1), Note("anomaly", "Absichtlicher Ruecklauf", "Zum ersten Mal startet die Schleife nicht gegen dich, sondern durch dich."))
            );

            AddScene("mira", "Akt V / Mira", "Echo im Keller", "Blindkammer / rotes Notlicht",
                "Mira zwingt dich nicht zu glauben. Nur zu benennen, wer du warst.",
                "Mira steht im roten Notlicht. Sie wirkt erschuetternd ruhig, als waere dein Erscheinen der erwartete Teil einer viel zu oft geuebten Szene.",
                "Mira steht direkt vor dir und sagt: 'Das ist nicht der erste Durchlauf. Du hast mich geloescht, damit du selbst weitermachen kannst.' Hinter ihr surrt die Anlage wie ein zweiter Puls.",
                "\"Du bist spaet, Elias.\"",
                "\"Wenn du dich diesmal erinnerst, endet vielleicht endlich etwas.\"",
                6,
                C("believe", "Mira glauben", "Du opferst deine sauberste Schutzbehauptung und nimmst ihre Version an.", "endingTruth",
                    Flag("acceptedMira", true), Insight(1), LoopDelta(1), Time(1), Note("diary", "Miras Gestaendnis", "Mira nennt dich beim vollen Namen und beschreibt dich als ersten Architekten des Protokolls.")),
                C("deny", "Mira als Halluzination abtun", "Vielleicht rettet dich Verdraengung. Vielleicht loescht sie nur sauberer.", "endingErase",
                    Shift(1), Integrity(-2), LoopDelta(1), Time(1)),
                C("break", "Das Protokoll zerreissen", "Du zerstoerst den Rahmen, ohne zu wissen, ob du Wahrheit oder Wiederholung befreist.", "endingLoop",
                    Shift(2), Stress(1), LoopDelta(1), Time(1)),
                RequireFlag(C("leave", "Mira einen Ausgang geben", "Das Gegenband gibt ihr genug Eigengewicht fuer den Schritt aus der Anlage.", "endingTruth",
                    Flag("miraLeaves", true), Integrity(2), LoopDelta(1), Time(1), Note("diary", "Mira verlaesst die Anlage", "Mira tritt aus dem roten Licht, ohne wieder in die Ruecksetzung gezogen zu werden.")), "miraCanLeave", "Du brauchst das eingespeiste Gegenband.")
            );

            AddScene("endingTruth", "Ende / Originalprotokoll", "Ende: Offenlegung", "Archiv ohne Ausgang",
                "Du kennst deine Rolle. Jetzt entscheidest du, was in den naechsten Durchlauf sickert.",
                "Mira ueberreicht dir ein Bandgeraet. Darauf bist du: 'Subjekt vergisst nach jedem Durchlauf. Nur kontrollierte Fragmente freigeben.'",
                "Das Band bleibt nicht stumm. Du hoerst dich sagen: 'Wenn Mira mich noch erkennt, darf sie mich nicht stoppen.' Hinter dem Regal beginnt bereits wieder Regen.",
                "\"Du hast das gebaut, Elias. Aber du musst nicht so weiterbauen.\"",
                "\"Entweder du erinnerst dich. Oder du laesst mir wenigstens Spuren.\"",
                0,
                C("fragment", "Neuen Durchlauf mit Fragment starten", "Du akzeptierst die Schleife, aber nicht mehr ihre Vollstaendigkeit.", "office",
                    LoopDelta(1), Shift(1), Insight(1), Note("anomaly", "Fragment behalten", "Im naechsten Durchlauf bleibt ein Rest der Bandaufnahme in deinem Kopf.")),
                C("archive", "Miras Akte als Startpunkt sichern", "Weniger Wahrheit in dir, mehr Wahrheit im Fall.", "office",
                    LoopDelta(1), Integrity(1), Note("clue", "Notizen gesichert", "Miras Hinweise werden zur ersten Spur des neuen Durchlaufs."))
            );

            AddScene("endingContain", "Ende / Containment", "Ende: Kontrollierte Nacht", "Schleusenherz",
                "Du verhinderst den Kollaps, aber nicht die Schuld.",
                "Die Anlage faehrt herunter, ohne zu sterben. Das Echo bleibt in der Dienststelle gefangen. Draussen wird es Morgen, aber Mira bleibt im System als Anker markiert.",
                "Der Morgen kommt nicht ganz. Die Sonne bleibt hinter Glas, und jeder im Haus vergisst einen anderen Teil der Nacht. Nur du erinnerst dich an genug, um dich schlecht zu fuehlen.",
                "\"Sicherheit ist kein Freispruch.\"",
                "\"Ein geschlossenes System nennt sich gern Rettung.\"",
                0,
                C("repair", "Containment ueberwachen", "Du spielst weiter als Waechter einer halben Wahrheit.", "office",
                    LoopDelta(1), Integrity(1), Stress(-1), Note("clue", "Containment-Wache", "Der naechste Durchlauf beginnt mit Zugriff auf Kontrollbegriffe.")),
                C("free", "Containment im naechsten Lauf brechen", "Du nimmst dir vor, diese Entscheidung nicht zu wiederholen.", "office",
                    LoopDelta(1), Shift(1), Insight(1), Note("diary", "Versprechen", "Du schreibst dir: 'Containment ist nur ein langsameres Verschwinden.'"))
            );

            AddScene("endingErase", "Ende / Selbstloeschung", "Ende: Selbstloeschung", "Verriegelter Verhoerraum",
                "Die Akte lebt weiter, aber Identitaet ist in dieser Version ein Kostenpunkt.",
                "Am Morgen existiert Mira in keiner Datei mehr. Alle Protokolle wirken sauber, fast beruhigend. Nur dein Puls weiss, dass etwas ausgeschnitten wurde.",
                "Am Morgen existierst du in keiner Datei mehr. Jonas findet nur eine leere Schichtmappe und einen Fall, der offiziell nie dir gehoerte.",
                "\"Geschlossene Systeme machen die stillsten Luecken.\"",
                "\"Wenn du dich loeschst, loescht dich das Protokoll gruendlicher zurueck.\"",
                0,
                C("reopen", "Die Akte trotzdem wieder oeffnen", "Instinkt vor Vernunft. Etwas in dir laesst sich nicht archivieren.", "office",
                    LoopDelta(1), Flag("openedFile", true), Shift(1), Note("diary", "Rueckfall", "Du oeffnest den Fall erneut, obwohl du keinen offiziellen Zugriff mehr hast.")),
                C("blank", "Ohne Erinnerung neu starten", "Du waehlst Ruhe, auch wenn sie kuenstlich ist.", "office",
                    LoopDelta(1), Shift(-2), Stress(-1), Integrity(1), Note("anomaly", "Blanker Neustart", "Der neue Durchlauf beginnt leiser, aber nicht sauber."))
            );

            AddScene("endingLoop", "Ende / Echo-Schleife", "Ende: Echo-Schleife", "Polizeibuero / 02:13 Uhr",
                "Die Nacht faltet sich auf den Anfang zurueck. Die Frage ist nur, was mitkommt.",
                "Du zerreisst das Protokoll. Regen trommelt gegen die Scheiben. Die Akte liegt wieder vor dir. Alles wirkt identisch, bis auf den Splitter in deiner Hand.",
                "Du bist wieder am Anfang. Vielleicht warst du nie weg. Auf dem Schreibtisch liegt bereits ein Foto aus einer Szene, die du in diesem Durchlauf noch gar nicht betreten hast.",
                "\"Noch einmal. Aber nicht genauso.\"",
                "\"Die Schleife lernt von dir, wenn du von ihr lernst.\"",
                1,
                C("again", "Mit Stoerung weiterlaufen", "Du nimmst den Fehler mit in den Anfang und hoffst, dass er reicht.", "office",
                    LoopDelta(1), Shift(1), Insight(1), Note("anomaly", "Stoerung mitgenommen", "Der Durchlauf startet mit einem Bildfragment aus dem Keller.")),
                C("observe", "Schleife beobachten statt brechen", "Weniger Gewalt, mehr Muster.", "office",
                    LoopDelta(1), Trust(1), Integrity(1), Note("clue", "Beobachtermodus", "Du merkst dir, wo die Nacht jedes Mal gleich beginnt."))
            );

            BuildDeepArchiveScenes();
        }

        private void BuildDeepArchiveScenes()
        {
            string[] districts = new string[]
            {
                "Nordhafen", "Klinikfluegel", "Altstadt", "Funkgitter", "Bahnhof West", "Unterstadt", "Archivkern", "Brueckenring",
                "Industriekanal", "Schlaflabor", "Containerfeld", "Verhoertrakt", "Signalwald", "Wasserwerk", "Schachtzone", "Nullarchiv"
            };
            string[] subjects = new string[]
            {
                "Ankerperson", "Ruecklauf", "Tonband", "Foto", "Klinikakte", "Badge", "Funkkanal", "Container",
                "Zeugin", "Therapieband", "Kreidekreis", "Dienstplan", "Brueckenbild", "Wartungstuer", "Spiegelprobe", "Schluessel",
                "Stromzaehler", "Faserfund", "Leitungsweg", "Notiz", "Archivstempel", "Aufzugcode", "Rotsignal", "Kontrollformular"
            };
            string[] layerNames = new string[] { "Sichtung", "Abgleich", "Konfrontation", "Revision" };

            Choice[] hubChoices = new Choice[ArchiveDistrictCount + 2];
            for (int d = 0; d < ArchiveDistrictCount; d++)
            {
                string start = ArchiveId(d, 0, 0);
                hubChoices[d] = C("district" + d.ToString("00"), districts[d] + " untersuchen", "Ein eigener Aktenstrang mit 24 Faellen und mehreren Schichten.", start,
                    Flag("district_" + d.ToString("00"), true), Score(15), Time(1), Note("clue", "Deep Archive: " + districts[d], "Du oeffnest den Distriktindex " + districts[d] + "."));
            }
            hubChoices[ArchiveDistrictCount] = C("main", "Zur Hauptakte zurueck", "Mira bleibt die zentrale Spur.", "office",
                Time(1), Note("clue", "Archiv verlassen", "Du laesst den Deep-Archive-Index offen fuer spaetere Rueckkehr."));
            hubChoices[ArchiveDistrictCount + 1] = RequireInsight(C("final", "Nullarchiv erzwingen", "Du springst zum Abschlussindex, wenn du genug Muster verstanden hast.", "archiveFinal",
                Score(100), Stress(1), Time(1), Note("anomaly", "Nullarchiv erzwungen", "Der Deep-Archive-Index klappt auf die letzte Seite.")), 8, "Du brauchst Einsicht 8.");

            AddScene("archiveHub", "Deep Archive / Index", "Der Grossakten-Index", "Archivkern / versteckte Ebene",
                "Waehle einen Distrikt. Jeder Strang sammelt Score, Einsicht und Beweise fuer spaete Kernoptionen.",
                "Der Grossakten-Index fuellt eine Wand aus Licht. Sechzehn Distrikte, hunderte Mikroakten, alles verknuepft mit Mira, dem Hafen und deiner Dienstkennung.",
                "Der Index reagiert auf deine Erinnerung. Manche Akten oeffnen sich erst, wenn du nicht direkt hinsiehst; andere tragen bereits deine Entscheidungen im Titel.",
                "\"Das ist nicht mehr eine Akte. Das ist eine Stadt aus Akten.\"",
                "\"Wenn eine Firma dieses Monster gebaut haette, haette sie wenigstens eine Suchfunktion eingebaut.\"",
                3,
                hubChoices);

            for (int d = 0; d < ArchiveDistrictCount; d++)
            {
                for (int c = 0; c < ArchiveCaseCount; c++)
                {
                    for (int l = 0; l < ArchiveLayerCount; l++)
                    {
                        string id = ArchiveId(d, c, l);
                        string district = districts[d];
                        string subject = subjects[(d + c + l) % subjects.Length];
                        string layer = layerNames[l];
                        string nextLayer = l + 1 < ArchiveLayerCount ? ArchiveId(d, c, l + 1) : NextArchiveCase(d, c);
                        string cross = ArchiveId((d + 1) % ArchiveDistrictCount, (c + 3) % ArchiveCaseCount, Math.Min(l + 1, ArchiveLayerCount - 1));
                        int caseNo = c + 1;
                        int minInsight = Math.Min(9, 2 + l + d / 5);
                        int minAccess = Math.Min(8, 1 + l + c / 9);

                        AddScene(id,
                            "Deep Archive / " + district + " / " + layer,
                            district + " Akte " + caseNo.ToString("00") + ": " + subject,
                            "Deep Archive / " + district,
                            "Arbeite die Akte durch, sammle Muster und entscheide, ob du tiefer gehst oder querverknuepfst.",
                            "Die Akte " + caseNo.ToString("00") + " im Distrikt " + district + " beschreibt " + subject + ". Zwischen Formularen, Fotos und Rufprotokollen liegt eine Spur, die nur halb zu Mira gehoert.",
                            "Die Akte " + caseNo.ToString("00") + " schreibt sich waehrend des Lesens um. " + subject + " wird zu deinem Namen, dann zu Miras, dann zu einer Nummer, die noch nicht vergeben wurde.",
                            "\"Akte " + caseNo.ToString("00") + " ist kein Nebenfall. Sie ist ein Seitenkanal.\"",
                            "\"Je laenger ich lese, desto mehr liest der Index zurueck.\"",
                            Math.Min(6, 2 + l),
                            C("secure", "Beweis sichern", "Solider Fortschritt, mehr Score und ein neuer Eintrag.", nextLayer,
                                Insight(1), Score(12 + l * 4), Time(1), Note("clue", district + " / " + subject, "Akte " + caseNo.ToString("00") + " liefert einen belastbaren Querverweis auf " + subject + ".")),
                            C("memory", "Erinnerung riskieren", "Mehr Einsicht, aber die Belastung steigt.", nextLayer,
                                Shift(1), Stress(1), Insight(2), Score(18 + l * 5), Time(1), Note("diary", district + " Erinnerung", "Die Akte erzeugt einen Erinnerungsrest: " + subject + " war schon vor Mira Teil des Echo-Systems.")),
                            RequireInsight(C("crosslink", "Querverbindung springen", "Schneller in andere Distrikte, wenn du die Muster lesen kannst.", cross,
                                Access(1), Score(26 + l * 6), Time(1), Note("anomaly", "Querverbindung", district + " verknuepft " + subject + " mit einem anderen Distrikt.")), minInsight, "Du brauchst Einsicht " + minInsight.ToString() + "."),
                            RequireAccess(C("extract", "Rohdaten extrahieren", "Technischer Zugriff fuer spaete Konsole und hoehere Rangwertung.", nextLayer,
                                Access(1), Integrity(-1), Score(34 + l * 7), Time(1), Note("photo", "Rohdaten", "Rohdaten aus " + district + " zeigen " + subject + " in einem anderen Durchlauf.")), minAccess, "Du brauchst Zugang " + minAccess.ToString() + "."),
                            C("hub", "Zum Index zurueck", "Spur parken und einen anderen Distrikt waehlen.", "archiveHub",
                                Time(1), Note("clue", "Spur geparkt", "Akte " + caseNo.ToString("00") + " aus " + district + " bleibt im Index markiert."))
                        );
                    }
                }
            }

            AddScene("archiveFinal", "Deep Archive / Nullarchiv", "Nullarchiv: Alle Akten zeigen zurueck", "Archivkern / schwarze Ebene",
                "Nutze den riesigen Index als Beweisblock fuer den Kern des Spiels.",
                "Das Nullarchiv hat keine Regale. Es besteht aus Verweisen: jeder Distrikt, jede Nebenakte, jeder Ruecklauf zeigt auf Mira als Anker und dich als wiederkehrenden Bediener.",
                "Das Nullarchiv zeigt nicht mehr Akten, sondern Konsequenzen. Jede Entscheidung haengt als weisse Linie im Raum und bildet einen Stadtplan, den nur die Schleife lesen kann.",
                "\"Ich wollte den groessten Fall der Nacht. Jetzt hat er keine Waende mehr.\"",
                "\"Wenn alle Akten zurueckzeigen, gibt es keinen Randfall mehr.\"",
                6,
                RequireInsight(C("proof", "Beweisblock verdichten", "Mehrere hundert Querverweise werden zu einem Kernbeweis.", "controlDesk",
                    Flag("deepArchiveProof", true), Score(300), Insight(2), Access(1), Time(2), Note("clue", "Deep-Archive-Beweisblock", "Der Beweisblock verbindet alle Distrikte mit dem Echo-Protokoll.")), 8, "Du brauchst Einsicht 8."),
                RequireAccess(C("operator", "Archiv als Betreiber oeffnen", "Du nutzt den Index als Kontrollschluessel.", "protocolRoom",
                    Flag("archiveOperator", true), Score(300), Access(2), Stress(1), Time(1), Note("anomaly", "Archiv-Betreiberzugang", "Das Nullarchiv erkennt dich als Betreiber einer zu grossen Maschine.")), 7, "Du brauchst Zugang 7."),
                C("return", "Mit offenem Index zurueck", "Der Grossaktenblock bleibt im Slot erhalten.", "archiveHub",
                    Score(50), Time(1), Note("clue", "Nullarchiv verlassen", "Der Index bleibt offen und kann weiter abgearbeitet werden."))
            );
        }

        private string ArchiveId(int district, int caseIndex, int layer)
        {
            return "archive_" + district.ToString("00") + "_" + caseIndex.ToString("00") + "_" + layer.ToString("00");
        }

        private string NextArchiveCase(int district, int caseIndex)
        {
            if (caseIndex + 1 < ArchiveCaseCount)
            {
                return ArchiveId(district, caseIndex + 1, 0);
            }
            if (district + 1 < ArchiveDistrictCount)
            {
                return ArchiveId(district + 1, 0, 0);
            }
            return "archiveFinal";
        }

        private void BuildUi()
        {
            TableLayoutPanel root = new TableLayoutPanel();
            root.Dock = DockStyle.Fill;
            root.Padding = new Padding(24);
            root.BackColor = Color.FromArgb(3, 6, 11);
            root.ColumnCount = 2;
            root.RowCount = 1;
            root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 70f));
            root.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 30f));
            Controls.Add(root);

            TableLayoutPanel left = new TableLayoutPanel();
            left.Dock = DockStyle.Fill;
            left.ColumnCount = 1;
            left.RowCount = 4;
            left.RowStyles.Add(new RowStyle(SizeType.Absolute, 136f));
            left.RowStyles.Add(new RowStyle(SizeType.Percent, 100f));
            left.RowStyles.Add(new RowStyle(SizeType.Absolute, 278f));
            left.RowStyles.Add(new RowStyle(SizeType.Absolute, 92f));
            root.Controls.Add(left, 0, 0);

            CardPanel header = new CardPanel();
            header.Dock = DockStyle.Fill;
            header.BorderColor = Color.FromArgb(76, 118, 171);
            header.AccentColor = Color.FromArgb(90, 200, 255);
            header.DenseBackdrop = true;
            header.HeroGlow = true;
            left.Controls.Add(header, 0, 0);

            _stage.AutoSize = true;
            _stage.ForeColor = Color.FromArgb(122, 184, 246);
            _stage.Font = new Font("Segoe UI Semibold", 11f, FontStyle.Bold);
            _stage.Location = new Point(24, 18);
            header.Controls.Add(_stage);

            _location.AutoSize = true;
            _location.ForeColor = Color.FromArgb(166, 180, 210);
            _location.Font = new Font("Segoe UI", 10.5f, FontStyle.Regular);
            _location.Location = new Point(24, 42);
            header.Controls.Add(_location);

            _title.AutoSize = true;
            _title.MaximumSize = new Size(900, 0);
            _title.Font = new Font("Segoe UI Semibold", 24f, FontStyle.Bold);
            _title.Location = new Point(24, 66);
            header.Controls.Add(_title);

            _objective.AutoSize = true;
            _objective.MaximumSize = new Size(940, 0);
            _objective.ForeColor = Color.FromArgb(214, 223, 244);
            _objective.Font = new Font("Segoe UI", 11.2f, FontStyle.Regular);
            _objective.Location = new Point(28, 110);
            header.Controls.Add(_objective);

            _buildMark.AutoSize = true;
            _buildMark.Text = "ATMOSPHERE BUILD 0.7";
            _buildMark.ForeColor = Color.FromArgb(245, 205, 112);
            _buildMark.Font = new Font("Consolas", 10f, FontStyle.Bold);
            _buildMark.Location = new Point(760, 22);
            _buildMark.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            header.Controls.Add(_buildMark);

            _modeDisplay.AutoSize = true;
            _modeDisplay.ForeColor = Color.FromArgb(170, 210, 255);
            _modeDisplay.Font = new Font("Consolas", 9.2f, FontStyle.Bold);
            _modeDisplay.Location = new Point(760, 44);
            _modeDisplay.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            header.Controls.Add(_modeDisplay);

            _timeDisplay.AutoSize = true;
            _timeDisplay.ForeColor = Color.FromArgb(150, 200, 255);
            _timeDisplay.Font = new Font("Consolas", 12f, FontStyle.Bold);
            _timeDisplay.Location = new Point(760, 64);
            _timeDisplay.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            header.Controls.Add(_timeDisplay);

            _messageDisplay.AutoSize = true;
            _messageDisplay.ForeColor = Color.FromArgb(255, 170, 190);
            _messageDisplay.Font = new Font("Segoe UI", 9.5f, FontStyle.Bold);
            _messageDisplay.Location = new Point(760, 88);
            _messageDisplay.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            _messageDisplay.Cursor = Cursors.Hand;
            _messageDisplay.Click += delegate { ShowMessagesOverlay(); };
            header.Controls.Add(_messageDisplay);

            header.Resize += delegate
            {
                _buildMark.Left = Math.Max(20, header.Width - _buildMark.Width - 28);
                _modeDisplay.Left = Math.Max(20, header.Width - _modeDisplay.Width - 28);
                _timeDisplay.Left = Math.Max(20, header.Width - _timeDisplay.Width - 28);
                _messageDisplay.Left = Math.Max(20, header.Width - _messageDisplay.Width - 28);
            };

            CardPanel sceneCard = new CardPanel();
            sceneCard.Dock = DockStyle.Fill;
            sceneCard.BorderColor = Color.FromArgb(58, 82, 122);
            sceneCard.AccentColor = Color.FromArgb(245, 94, 112);
            sceneCard.SceneBackdrop = true;
            sceneCard.HeroGlow = true;
            left.Controls.Add(sceneCard, 0, 1);

            _warn.AutoSize = true;
            _warn.BackColor = Color.FromArgb(154, 32, 49);
            _warn.ForeColor = Color.White;
            _warn.Font = new Font("Segoe UI Semibold", 10f, FontStyle.Bold);
            _warn.Padding = new Padding(10, 4, 10, 4);
            _warn.Location = new Point(22, 18);
            sceneCard.Controls.Add(_warn);

            _sceneText.AutoSize = true;
            _sceneText.MaximumSize = new Size(930, 0);
            _sceneText.Font = new Font("Segoe UI", 14f, FontStyle.Regular);
            _sceneText.ForeColor = Color.FromArgb(240, 245, 255);
            _sceneText.Location = new Point(22, 64);
            _sceneText.Visible = false;
            sceneCard.Controls.Add(_sceneText);

            _quote.AutoSize = true;
            _quote.MaximumSize = new Size(900, 0);
            _quote.Font = new Font("Segoe UI", 12.5f, FontStyle.Italic);
            _quote.ForeColor = Color.FromArgb(255, 178, 190);
            _quote.Location = new Point(22, 250);
            _quote.Visible = false;
            sceneCard.Controls.Add(_quote);

            _narrative.Location = new Point(18, 28);
            _narrative.Size = new Size(900, 430);
            _narrative.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            sceneCard.Controls.Add(_narrative);

            _sceneStrip.Location = new Point(22, 18);
            _sceneStrip.Size = new Size(760, 62);
            _sceneStrip.Anchor = AnchorStyles.Left | AnchorStyles.Right | AnchorStyles.Bottom;
            _sceneStrip.Top = sceneCard.Height - 84;
            _sceneStrip.Visible = true;
            sceneCard.Controls.Add(_sceneStrip);
            sceneCard.Resize += delegate
            {
                _narrative.Width = Math.Max(420, sceneCard.Width - 36);
                _narrative.Top = 28;
                _narrative.Height = Math.Max(260, sceneCard.Height - 126);
                _sceneStrip.Width = Math.Max(420, sceneCard.Width - 44);
                _sceneStrip.Top = Math.Max(280, sceneCard.Height - 82);
            };

            CardPanel choicesCard = new CardPanel();
            choicesCard.Dock = DockStyle.Fill;
            choicesCard.BorderColor = Color.FromArgb(70, 96, 145);
            choicesCard.AccentColor = Color.FromArgb(94, 213, 174);
            choicesCard.DenseBackdrop = true;
            choicesCard.HeroGlow = true;
            left.Controls.Add(choicesCard, 0, 2);

            Label choiceTitle = new Label();
            choiceTitle.AutoSize = true;
            choiceTitle.Text = L("Next step", "Naechster Schritt");
            choiceTitle.ForeColor = Color.FromArgb(122, 184, 246);
            choiceTitle.Font = new Font("Segoe UI Semibold", 10f, FontStyle.Bold);
            choiceTitle.Location = new Point(18, 18);
            choicesCard.Controls.Add(choiceTitle);

            _meta.AutoSize = true;
            _meta.ForeColor = Color.FromArgb(151, 166, 195);
            _meta.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            _meta.Location = new Point(18, 42);
            choicesCard.Controls.Add(_meta);

            _choices.Location = new Point(18, 70);
            _choices.Size = new Size(944, 194);
            _choices.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            _choices.FlowDirection = FlowDirection.TopDown;
            _choices.WrapContents = false;
            _choices.AutoScroll = false;
            choicesCard.Controls.Add(_choices);

            CardPanel footer = new CardPanel();
            footer.Dock = DockStyle.Fill;
            footer.BorderColor = Color.FromArgb(43, 57, 84);
            footer.AccentColor = Color.FromArgb(245, 205, 112);
            footer.HeroGlow = true;
            left.Controls.Add(footer, 0, 3);

            _signal.AutoSize = true;
            _signal.MaximumSize = new Size(900, 0);
            _signal.ForeColor = Color.FromArgb(212, 223, 247);
            _signal.Font = new Font("Segoe UI", 10.2f, FontStyle.Regular);
            _signal.Location = new Point(22, 16);
            footer.Controls.Add(_signal);

            FlowLayoutPanel footerActions = new FlowLayoutPanel();
            footerActions.FlowDirection = FlowDirection.LeftToRight;
            footerActions.AutoSize = true;
            footerActions.Location = new Point(22, 48);

            Button saveBtn = CreateActionButton(L("Save", "Speichern"));
            saveBtn.Click += delegate { SaveCurrentSlot(); };
            Button loadBtn = CreateActionButton(L("Load", "Laden"));
            loadBtn.Click += delegate { LoadSelectedSlot(); };
            Button newBtn = CreateActionButton(L("New save", "Neuer Stand"));
            newBtn.Click += delegate { NewSelectedSlot(); };
            Button deleteBtn = CreateActionButton(L("Clear slot", "Slot leeren"));
            deleteBtn.Click += delegate { DeleteSelectedSlot(); };

            footerActions.Controls.Add(saveBtn);
            footerActions.Controls.Add(loadBtn);
            footerActions.Controls.Add(newBtn);
            footerActions.Controls.Add(deleteBtn);
            footer.Controls.Add(footerActions);

            TableLayoutPanel right = new TableLayoutPanel();
            right.Dock = DockStyle.Fill;
            right.ColumnCount = 1;
            right.RowCount = 3;
            right.RowStyles.Add(new RowStyle(SizeType.Absolute, 352f));
            right.RowStyles.Add(new RowStyle(SizeType.Percent, 100f));
            right.RowStyles.Add(new RowStyle(SizeType.Absolute, 190f));
            root.Controls.Add(right, 1, 0);

            CardPanel status = new CardPanel();
            status.Dock = DockStyle.Fill;
            status.BorderColor = Color.FromArgb(87, 123, 174);
            status.AccentColor = Color.FromArgb(94, 213, 174);
            status.DenseBackdrop = true;
            status.HeroGlow = true;
            right.Controls.Add(status, 0, 0);

            Label statusTitle = new Label();
            statusTitle.Text = L("Case status", "Fallstatus");
            statusTitle.AutoSize = true;
            statusTitle.ForeColor = Color.FromArgb(238, 243, 255);
            statusTitle.Font = new Font("Segoe UI Semibold", 15f, FontStyle.Bold);
            statusTitle.Location = new Point(18, 18);
            status.Controls.Add(statusTitle);

            AddMeter(status, L("Reality Shift", "Reality Shift"), _shiftBar, _shiftValue, 56, 7);
            AddMeter(status, L("Stress", "Belastung"), _stressBar, _stressValue, 100, 7);
            AddMeter(status, L("Jonas trust", "Jonas-Vertrauen"), _trustBar, _trustValue, 144, 6);
            AddMeter(status, L("Insight", "Einsicht"), _insightBar, _insightValue, 188, 10);
            AddMeter(status, L("Access", "Zugang"), _accessBar, _accessValue, 232, 10);
            AddMeter(status, L("Integrity", "Integritaet"), _integrityBar, _integrityValue, 276, 10);

            _loopValue.AutoSize = true;
            _loopValue.ForeColor = Color.FromArgb(238, 243, 255);
            _loopValue.Font = new Font("Segoe UI Semibold", 10f, FontStyle.Bold);
            _loopValue.Location = new Point(18, 322);
            status.Controls.Add(_loopValue);

            CardPanel dossier = new CardPanel();
            dossier.Dock = DockStyle.Fill;
            dossier.BorderColor = Color.FromArgb(53, 72, 109);
            dossier.AccentColor = Color.FromArgb(90, 200, 255);
            dossier.HeroGlow = true;
            right.Controls.Add(dossier, 0, 1);

            Label dossierTitle = new Label();
            dossierTitle.Text = L("Case file", "Fallakte");
            dossierTitle.AutoSize = true;
            dossierTitle.ForeColor = Color.FromArgb(238, 243, 255);
            dossierTitle.Font = new Font("Segoe UI Semibold", 15f, FontStyle.Bold);
            dossierTitle.Location = new Point(18, 18);
            dossier.Controls.Add(dossierTitle);

            _caseTabs.FlowDirection = FlowDirection.LeftToRight;
            _caseTabs.WrapContents = false;
            _caseTabs.AutoScroll = false;
            _caseTabs.Location = new Point(18, 56);
            _caseTabs.Size = new Size(520, 34);
            _caseTabs.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;
            dossier.Controls.Add(_caseTabs);

            AddCaseTab("clue", L("Clues", "Hinweise"));
            AddCaseTab("diary", L("Diary", "Tagebuch"));
            AddCaseTab("photo", L("Photos", "Fotos"));
            AddCaseTab("anomaly", L("Anomalies", "Anomalien"));
            AddCaseTab("timeline", "Timeline");
            AddCaseTab("lead", L("Leads", "Faehrten"));
            AddCaseTab("achievement", L("Achievements", "Erfolge"));

            _caseView.Location = new Point(18, 96);
            _caseView.Size = new Size(520, 318);
            _caseView.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            _caseView.ReadOnly = true;
            _caseView.BorderStyle = BorderStyle.None;
            _caseView.BackColor = Color.FromArgb(5, 8, 15);
            _caseView.ForeColor = Color.FromArgb(229, 237, 252);
            _caseView.Font = new Font("Consolas", 10.4f, FontStyle.Regular);
            _caseView.ScrollBars = RichTextBoxScrollBars.None;
            dossier.Controls.Add(_caseView);

            CardPanel savePanel = new CardPanel();
            savePanel.Dock = DockStyle.Fill;
            savePanel.BorderColor = Color.FromArgb(94, 58, 84);
            savePanel.AccentColor = Color.FromArgb(245, 94, 112);
            savePanel.HeroGlow = true;
            right.Controls.Add(savePanel, 0, 2);

            Label saveTitle = new Label();
            saveTitle.Text = L("Save slots", "Speicherstaende");
            saveTitle.AutoSize = true;
            saveTitle.ForeColor = Color.FromArgb(255, 197, 207);
            saveTitle.Font = new Font("Segoe UI Semibold", 13f, FontStyle.Bold);
            saveTitle.Location = new Point(18, 18);
            savePanel.Controls.Add(saveTitle);

            _slotSelect.DropDownStyle = ComboBoxStyle.DropDownList;
            _slotSelect.BackColor = Color.FromArgb(8, 12, 21);
            _slotSelect.ForeColor = Color.FromArgb(238, 243, 255);
            _slotSelect.FlatStyle = FlatStyle.Flat;
            _slotSelect.Location = new Point(18, 52);
            _slotSelect.Width = 355;
            _slotSelect.SelectedIndexChanged += delegate
            {
                if (!_updatingSlots && _slotSelect.SelectedIndex >= 0)
                {
                    _activeSlot = _slotSelect.SelectedIndex + 1;
                    RefreshSlotInfo();
                }
            };
            savePanel.Controls.Add(_slotSelect);

            _slotInfo.AutoSize = true;
            _slotInfo.MaximumSize = new Size(490, 0);
            _slotInfo.ForeColor = Color.FromArgb(230, 224, 236);
            _slotInfo.Font = new Font("Segoe UI", 10f, FontStyle.Regular);
            _slotInfo.Location = new Point(18, 86);
            savePanel.Controls.Add(_slotInfo);

            _threadSummary.AutoSize = true;
            _threadSummary.MaximumSize = new Size(490, 0);
            _threadSummary.ForeColor = Color.FromArgb(224, 229, 245);
            _threadSummary.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            _threadSummary.Location = new Point(18, 126);
            savePanel.Controls.Add(_threadSummary);
        }

        private void AddMeter(Control parent, string label, MeterBar bar, Label value, int top, int max)
        {
            Label meterLabel = new Label();
            meterLabel.AutoSize = true;
            meterLabel.Text = label;
            meterLabel.ForeColor = Color.FromArgb(158, 172, 202);
            meterLabel.Font = new Font("Segoe UI", 9.2f, FontStyle.Regular);
            meterLabel.Location = new Point(18, top);

            bar.MaximumValue = max;
            bar.CurrentValue = 0;
            bar.Size = new Size(210, 16);
            bar.Location = new Point(18, top + 19);
            if (label == "Belastung") bar.FillColor = Color.FromArgb(244, 93, 112);
            else if (label == "Jonas-Vertrauen") bar.FillColor = Color.FromArgb(245, 205, 112);
            else if (label == "Reality Shift") bar.FillColor = Color.FromArgb(90, 200, 255);
            else if (label == "Integritaet") bar.FillColor = Color.FromArgb(94, 213, 174);
            else bar.FillColor = Color.FromArgb(150, 126, 255);

            value.AutoSize = true;
            value.ForeColor = Color.FromArgb(238, 243, 255);
            value.Font = new Font("Segoe UI Semibold", 9.2f, FontStyle.Bold);
            value.Location = new Point(238, top + 17);

            parent.Controls.Add(meterLabel);
            parent.Controls.Add(bar);
            parent.Controls.Add(value);
        }

        private void AddCaseTab(string key, string text)
        {
            EchoButton button = new EchoButton();
            button.Text = text;
            button.Tag = key;
            button.AccentColor = Color.FromArgb(90, 200, 255);
            button.Size = new Size(74, 28);
            button.Font = new Font("Segoe UI Semibold", 8.2f, FontStyle.Regular);
            button.Margin = new Padding(0, 0, 5, 0);
            button.Click += delegate
            {
                _activeCaseTab = key;
                RenderCaseFile();
            };
            _caseTabs.Controls.Add(button);
        }

        private TabPage CreateTab(string title, out RichTextBox box)
        {
            TabPage page = new TabPage(title);
            page.BackColor = Color.FromArgb(10, 15, 26);
            page.ForeColor = Color.FromArgb(238, 243, 255);

            box = new RichTextBox();
            box.Dock = DockStyle.Fill;
            box.ReadOnly = true;
            box.BorderStyle = BorderStyle.None;
            box.BackColor = Color.FromArgb(10, 15, 26);
            box.ForeColor = Color.FromArgb(228, 234, 248);
            box.Font = new Font("Consolas", 10f, FontStyle.Regular);
            box.ScrollBars = RichTextBoxScrollBars.Vertical;

            page.Controls.Add(box);
            return page;
        }

        private Button CreateActionButton(string text)
        {
            EchoButton button = new EchoButton();
            button.Text = text;
            button.AutoSize = true;
            button.AccentColor = Color.FromArgb(245, 205, 112);
            button.ForeColor = Color.FromArgb(238, 243, 255);
            button.Padding = new Padding(14, 7, 14, 7);
            button.Margin = new Padding(0, 0, 10, 0);
            return button;
        }

        private void Render()
        {
            Scene scene;
            if (!_scenes.TryGetValue(_sceneId, out scene))
            {
                _sceneId = "office";
                scene = _scenes[_sceneId];
            }

            _stage.Text = LocalizeContent(scene.Stage);
            _location.Text = LocalizeContent(scene.Location);
            _title.Text = LocalizeContent(scene.Title);
            _objective.Text = LocalizeContent(scene.Objective);
            _sceneText.Text = LocalizeContent(_shift >= 2 ? scene.TextShifted : scene.TextNormal);
            _quote.Text = LocalizeContent(_shift >= 2 ? scene.QuoteShifted : scene.QuoteNormal);
            _narrative.NarrativeText = _sceneText.Text;
            _narrative.QuoteText = _quote.Text;
            _narrative.Shift = _shift;
            _narrative.Stress = _stress;
            if (_narrative.Parent != null)
            {
                _narrative.Bounds = new Rectangle(18, 28, Math.Max(420, _narrative.Parent.Width - 36), Math.Max(260, _narrative.Parent.Height - 126));
                _narrative.BringToFront();
            }
            _narrative.Invalidate();

            string warning = BuildWarning(scene);
            _warn.Visible = warning.Length > 0;
            _warn.Text = warning;

            _shiftBar.CurrentValue = Clamp(_shift, 0, 7);
            _stressBar.CurrentValue = Clamp(_stress, 0, 7);
            _trustBar.CurrentValue = Clamp(_trust + 3, 0, 6);
            _insightBar.CurrentValue = Clamp(_insight, 0, 10);
            _accessBar.CurrentValue = Clamp(_access, 0, 10);
            _integrityBar.CurrentValue = Clamp(_integrity, 0, 10);

            _shiftValue.Text = _shift.ToString() + " / 7";
            _stressValue.Text = _stress.ToString() + " / 7";
            _trustValue.Text = TrustLabel();
            _insightValue.Text = _insight.ToString() + " / 10";
            _accessValue.Text = _access.ToString() + " / 10";
            _integrityValue.Text = _integrity.ToString() + " / 10";
            _loopValue.Text = L("Run ", "Durchlauf ") + _loop.ToString() + " | +" + _hours.ToString() + "h | " + RankLabel() + " | Score " + _score.ToString();
            _sceneStrip.SceneId = scene.Id;
            _sceneStrip.Score = _score;
            _sceneStrip.Decisions = _decisions.Count;
            _sceneStrip.Shift = _shift;
            if (_sceneStrip.Parent != null)
            {
                _sceneStrip.Width = Math.Max(420, _sceneStrip.Parent.Width - 44);
                _sceneStrip.Top = Math.Max(280, _sceneStrip.Parent.Height - 82);
                _sceneStrip.BringToFront();
            }
            _sceneStrip.Invalidate();

            _meta.Text = LocalizeContent(L("Decisions ", "Entscheidungen ") + _decisions.Count.ToString() + " | " + L("Scene ", "Szene ") + scene.Id + " | " + L("Quick select 1-", "Direktwahl 1-") + scene.Choices.Length.ToString());
            _signal.Text = BuildSignalText(scene);
            _threadSummary.Text = BuildThreadSummary();
            UpdateTimeDisplay();

            RenderChoices(scene);
            RenderCaseFile();
            RefreshSlotInfo();
        }

        private void RenderChoices(Scene scene)
        {
            _choices.Controls.Clear();
            _choiceButtons.Clear();

            for (int i = 0; i < scene.Choices.Length; i++)
            {
                Choice choice = scene.Choices[i];
                bool unlocked = IsChoiceUnlocked(choice);
                string hint = unlocked ? LocalizeContent(choice.Hint) : LocalizeContent(L("Locked: ", "Gesperrt: ") + LockedReason(choice));

                EchoButton button = new EchoButton();
                button.AccentColor = unlocked ? Color.FromArgb(94, 213, 174) : Color.FromArgb(120, 80, 95);
                button.Important = choice.Next.StartsWith("ending") || choice.Next == "archiveHub" || choice.Next == "mira";
                button.Text = (i + 1).ToString("00") + "  " + LocalizeContent(choice.Label) + Environment.NewLine + hint;
                button.Size = new Size(Math.Max(560, _choices.ClientSize.Width - 18), 58);
                button.TextAlign = ContentAlignment.MiddleLeft;
                button.ForeColor = unlocked ? Color.FromArgb(238, 243, 255) : Color.FromArgb(143, 148, 166);
                button.Font = new Font("Segoe UI", 10f, FontStyle.Regular);
                button.Margin = new Padding(0, 0, 0, 7);
                button.Enabled = unlocked;
                _choicePreview.SetToolTip(button, BuildChoicePreview(choice));

                int capturedIndex = i;
                button.Click += delegate { Choose(capturedIndex); };
                _choices.Controls.Add(button);
                _choiceButtons.Add(button);
            }
        }

        private void RenderCaseFile()
        {
            _clueBox.Text = BuildNoteText("clue", 16);
            _diaryBox.Text = BuildNoteText("diary", 16);
            _photoBox.Text = BuildNoteText("photo", 16);
            _anomalyBox.Text = BuildNoteText("anomaly", 16);
            _timelineBox.Text = BuildTimelineText();
            _leadBox.Text = BuildLeadText();
            _achievementBox.Text = BuildAchievementText();
            if (_caseView != null)
            {
                if (_activeCaseTab == "diary") _caseView.Text = _diaryBox.Text;
                else if (_activeCaseTab == "photo") _caseView.Text = _photoBox.Text;
                else if (_activeCaseTab == "anomaly") _caseView.Text = _anomalyBox.Text;
                else if (_activeCaseTab == "timeline") _caseView.Text = _timelineBox.Text;
                else if (_activeCaseTab == "lead") _caseView.Text = _leadBox.Text;
                else if (_activeCaseTab == "achievement") _caseView.Text = _achievementBox.Text;
                else _caseView.Text = _clueBox.Text;
                HighlightCaseTabs();
            }
        }

        private void HighlightCaseTabs()
        {
            for (int i = 0; i < _caseTabs.Controls.Count; i++)
            {
                EchoButton button = _caseTabs.Controls[i] as EchoButton;
                if (button == null) continue;
                bool active = Convert.ToString(button.Tag) == _activeCaseTab;
                button.Important = active;
                button.AccentColor = active ? Color.FromArgb(245, 205, 112) : Color.FromArgb(90, 200, 255);
                button.Invalidate();
            }
        }

        private void Choose(int index)
        {
            Scene scene;
            if (!_scenes.TryGetValue(_sceneId, out scene))
            {
                return;
            }
            if (index < 0 || index >= scene.Choices.Length)
            {
                return;
            }

            Choice choice = scene.Choices[index];
            if (!IsChoiceUnlocked(choice))
            {
                return;
            }

            ApplyEffects(choice.Effects, scene.Id);
            CheckClueCombos();
            _decisions.Add(scene.Id + ":" + choice.Id);
            _score = Math.Max(0, _score + 5);

            int baseChoiceMinutes = 3;
            if (_gameMode == GameMode.Hard) baseChoiceMinutes = 2;
            else if (_gameMode == GameMode.Speedrun) baseChoiceMinutes = 1;
            AdvanceClock(baseChoiceMinutes);

            _sceneId = choice.Next;

            SaveSlot(_activeSlot);
            RefreshSlotSelector();
            Render();
        }

        private bool IsChoiceUnlocked(Choice choice)
        {
            if (!string.IsNullOrEmpty(choice.RequiredFlag) && !GetFlag(choice.RequiredFlag)) return false;
            if (!string.IsNullOrEmpty(choice.ForbiddenFlag) && GetFlag(choice.ForbiddenFlag)) return false;
            if (_insight < choice.MinInsight) return false;
            if (_access < choice.MinAccess) return false;
            if (_integrity < choice.MinIntegrity) return false;
            if (_trust < choice.MinTrust) return false;
            if (_stress > choice.MaxStress) return false;
            return true;
        }

        private string LockedReason(Choice choice)
        {
            if (!string.IsNullOrEmpty(choice.LockHint)) return choice.LockHint;
            if (!string.IsNullOrEmpty(choice.RequiredFlag)) return "Eine passende Spur fehlt.";
            if (_insight < choice.MinInsight) return "Mehr Einsicht noetig.";
            if (_access < choice.MinAccess) return "Mehr Zugang noetig.";
            if (_integrity < choice.MinIntegrity) return "Mehr Integritaet noetig.";
            if (_trust < choice.MinTrust) return "Jonas vertraut dir nicht genug.";
            if (_stress > choice.MaxStress) return "Belastung zu hoch.";
            return "Noch nicht verfuegbar.";
        }

        private void ApplyEffects(Effect[] effects, string sceneId)
        {
            if (effects == null) return;

            for (int i = 0; i < effects.Length; i++)
            {
                Effect effect = effects[i];
                if (effect.Type == "flag") _flags[effect.Key] = effect.BoolValue;
                else if (effect.Type == "shift") _shift = Clamp(_shift + effect.IntValue, 0, 7);
                else if (effect.Type == "stress") _stress = Clamp(_stress + effect.IntValue, 0, 7);
                else if (effect.Type == "trust") _trust = Clamp(_trust + effect.IntValue, -3, 3);
                else if (effect.Type == "loop") _loop = Math.Max(1, _loop + effect.IntValue);
                else if (effect.Type == "insight") _insight = Clamp(_insight + effect.IntValue, 0, 10);
                else if (effect.Type == "access") _access = Clamp(_access + effect.IntValue, 0, 10);
                else if (effect.Type == "integrity") _integrity = Clamp(_integrity + effect.IntValue, 0, 10);
                else if (effect.Type == "time") _hours = Math.Max(0, _hours + effect.IntValue);
                else if (effect.Type == "score") _score = Math.Max(0, _score + effect.IntValue);
                else if (effect.Type == "note")
                {
                    _notes.Add(new NoteItem
                    {
                        Type = effect.NoteType,
                        SceneId = sceneId,
                        Title = effect.NoteTitle,
                        Text = effect.NoteText
                    });
                }
            }
        }

        private void ResetState()
        {
            _sceneId = "office";
            _shift = 0;
            _stress = 1;
            _trust = 0;
            _loop = 1;
            _insight = 0;
            _access = 0;
            _integrity = 8;
            _hours = 0;
            _score = 0;
            _comboCount = 0;
            _shiftElapsedMinutes = 0;
            _flags.Clear();
            _notes.Clear();
            _decisions.Clear();
            _messages.Clear();
            _triggeredCombos.Clear();
            _notes.Add(new NoteItem { Type = "clue", SceneId = "office", Title = L("Starting point", "Ausgangslage"), Text = L("Mira Hartmann missing for 11 days.", "Mira Hartmann seit 11 Tagen vermisst.") });
            EnsureStartupMessages();
            UpdateTimeDisplay();
        }

        private void SaveCurrentSlot()
        {
            SaveSlot(_activeSlot);
            RefreshSlotSelector();
            RefreshSlotInfo();
        }

        private void LoadSelectedSlot()
        {
            int slot = SelectedSlot();
            _activeSlot = slot;
            if (!LoadSlot(slot))
            {
                ResetState();
                SaveSlot(slot);
            }
            RefreshSlotSelector();
            Render();
        }

        private void NewSelectedSlot()
        {
            _activeSlot = SelectedSlot();
            ResetState();
            SaveSlot(_activeSlot);
            RefreshSlotSelector();
            Render();
        }

        private void DeleteSelectedSlot()
        {
            int slot = SelectedSlot();
            string path = SlotFile(slot);
            if (File.Exists(path))
            {
                File.Delete(path);
            }
            _activeSlot = slot;
            ResetState();
            RefreshSlotSelector();
            Render();
        }

        private int SelectedSlot()
        {
            if (_slotSelect.SelectedIndex < 0) return _activeSlot;
            return _slotSelect.SelectedIndex + 1;
        }

        private string SlotFile(int slot)
        {
            return Path.Combine(SaveFolder, "slot-" + slot.ToString() + ".txt");
        }

        private void SaveSlot(int slot)
        {
            if (!Directory.Exists(SaveFolder))
            {
                Directory.CreateDirectory(SaveFolder);
            }

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("savedAt=" + Encode(DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss")));
            sb.AppendLine("scene=" + Encode(_sceneId));
            sb.AppendLine("shift=" + _shift.ToString());
            sb.AppendLine("stress=" + _stress.ToString());
            sb.AppendLine("trust=" + _trust.ToString());
            sb.AppendLine("loop=" + _loop.ToString());
            sb.AppendLine("insight=" + _insight.ToString());
            sb.AppendLine("access=" + _access.ToString());
            sb.AppendLine("integrity=" + _integrity.ToString());
            sb.AppendLine("hours=" + _hours.ToString());
            sb.AppendLine("score=" + _score.ToString());
            sb.AppendLine("gameMode=" + _gameMode.ToString());
            sb.AppendLine("shiftTotalMinutes=" + _shiftTotalMinutes.ToString());
            sb.AppendLine("shiftElapsedMinutes=" + _shiftElapsedMinutes.ToString());
            sb.AppendLine("comboCount=" + _comboCount.ToString());

            foreach (KeyValuePair<string, bool> pair in _flags)
            {
                sb.AppendLine("flag=" + Encode(pair.Key) + "|" + (pair.Value ? "1" : "0"));
            }

            foreach (KeyValuePair<string, bool> pair in _triggeredCombos)
            {
                sb.AppendLine("combo=" + Encode(pair.Key) + "|" + (pair.Value ? "1" : "0"));
            }

            for (int i = 0; i < _decisions.Count; i++)
            {
                sb.AppendLine("decision=" + Encode(_decisions[i]));
            }

            for (int i = 0; i < _notes.Count; i++)
            {
                NoteItem item = _notes[i];
                sb.AppendLine("note=" + Encode(item.Type) + "|" + Encode(item.SceneId) + "|" + Encode(item.Title) + "|" + Encode(item.Text));
            }

            for (int i = 0; i < _messages.Count; i++)
            {
                IncomingMessage msg = _messages[i];
                sb.AppendLine("msg=" + Encode(msg.Sender) + "|" + Encode(msg.Content) + "|" + (msg.IsRead ? "1" : "0"));
            }

            File.WriteAllText(SlotFile(slot), sb.ToString(), Encoding.UTF8);
        }

        private bool LoadSlot(int slot)
        {
            string file = SlotFile(slot);
            if (!File.Exists(file))
            {
                ResetState();
                SaveSlot(slot);
                _activeSlot = slot;
                return true;
            }

            try
            {
                ResetState();
                string[] lines = File.ReadAllLines(file, Encoding.UTF8);
                for (int i = 0; i < lines.Length; i++)
                {
                    string line = lines[i];
                    if (line.StartsWith("scene=")) _sceneId = Decode(line.Substring(6));
                    else if (line.StartsWith("shift=")) _shift = ParseInt(line.Substring(6), 0);
                    else if (line.StartsWith("stress=")) _stress = ParseInt(line.Substring(7), 1);
                    else if (line.StartsWith("trust=")) _trust = ParseInt(line.Substring(6), 0);
                    else if (line.StartsWith("loop=")) _loop = Math.Max(1, ParseInt(line.Substring(5), 1));
                    else if (line.StartsWith("insight=")) _insight = ParseInt(line.Substring(8), 0);
                    else if (line.StartsWith("access=")) _access = ParseInt(line.Substring(7), 0);
                    else if (line.StartsWith("integrity=")) _integrity = ParseInt(line.Substring(10), 8);
                    else if (line.StartsWith("hours=")) _hours = ParseInt(line.Substring(6), 0);
                    else if (line.StartsWith("score=")) _score = ParseInt(line.Substring(6), 0);
                    else if (line.StartsWith("gameMode="))
                    {
                        string rawMode = line.Substring(9);
                        if (string.Equals(rawMode, "Hard", StringComparison.OrdinalIgnoreCase)) _gameMode = GameMode.Hard;
                        else if (string.Equals(rawMode, "Speedrun", StringComparison.OrdinalIgnoreCase)) _gameMode = GameMode.Speedrun;
                        else _gameMode = GameMode.Normal;
                    }
                    else if (line.StartsWith("shiftTotalMinutes=")) _shiftTotalMinutes = ParseInt(line.Substring(17), _shiftTotalMinutes);
                    else if (line.StartsWith("shiftElapsedMinutes=")) _shiftElapsedMinutes = ParseInt(line.Substring(19), 0);
                    else if (line.StartsWith("comboCount=")) _comboCount = ParseInt(line.Substring(11), 0);
                    else if (line.StartsWith("flag="))
                    {
                        string[] parts = line.Substring(5).Split('|');
                        if (parts.Length >= 2) _flags[Decode(parts[0])] = parts[1] == "1";
                    }
                    else if (line.StartsWith("combo="))
                    {
                        string[] parts = line.Substring(6).Split('|');
                        if (parts.Length >= 2) _triggeredCombos[Decode(parts[0])] = parts[1] == "1";
                    }
                    else if (line.StartsWith("msg="))
                    {
                        string[] parts = line.Substring(4).Split('|');
                        if (parts.Length >= 3)
                        {
                            _messages.Add(new IncomingMessage
                            {
                                Sender = Decode(parts[0]),
                                Content = Decode(parts[1]),
                                IsRead = parts[2] == "1"
                            });
                        }
                    }
                    else if (line.StartsWith("decision="))
                    {
                        _decisions.Add(Decode(line.Substring(9)));
                    }
                    else if (line.StartsWith("note="))
                    {
                        string[] parts = line.Substring(5).Split('|');
                        if (parts.Length >= 4)
                        {
                            _notes.Add(new NoteItem { Type = Decode(parts[0]), SceneId = Decode(parts[1]), Title = Decode(parts[2]), Text = Decode(parts[3]) });
                        }
                    }
                }

                _shift = Clamp(_shift, 0, 7);
                _stress = Clamp(_stress, 0, 7);
                _trust = Clamp(_trust, -3, 3);
                _insight = Clamp(_insight, 0, 10);
                _access = Clamp(_access, 0, 10);
                _integrity = Clamp(_integrity, 0, 10);
                _score = Math.Max(0, _score);
                _shiftTotalMinutes = Math.Max(1, _shiftTotalMinutes);
                _shiftElapsedMinutes = Math.Max(0, _shiftElapsedMinutes);
                if (!_scenes.ContainsKey(_sceneId)) _sceneId = "office";
                if (_notes.Count == 0) _notes.Add(new NoteItem { Type = "clue", SceneId = "office", Title = L("Starting point", "Ausgangslage"), Text = L("Mira Hartmann missing for 11 days.", "Mira Hartmann seit 11 Tagen vermisst.") });
                if (_messages.Count == 0) EnsureStartupMessages();
                _comboCount = Math.Max(_comboCount, _triggeredCombos.Count);
                _activeSlot = slot;
                return true;
            }
            catch
            {
                ResetState();
                _notes.Add(new NoteItem { Type = "anomaly", SceneId = "office", Title = L("Corrupted save", "Defekter Spielstand"), Text = L("This save slot was corrupted and has been reinitialized.", "Dieser Speicherstand war beschaedigt und wurde neu initialisiert.") });
                _activeSlot = slot;
                SaveSlot(slot);
                return false;
            }
        }

        private void RefreshSlotSelector()
        {
            _updatingSlots = true;
            _slotSelect.Items.Clear();
            for (int i = 1; i <= SlotCount; i++)
            {
                _slotSelect.Items.Add(BuildSlotLabel(i));
            }
            _slotSelect.SelectedIndex = Clamp(_activeSlot, 1, SlotCount) - 1;
            _updatingSlots = false;
            RefreshSlotInfo();
        }

        private string BuildSlotLabel(int slot)
        {
            string path = SlotFile(slot);
            if (!File.Exists(path)) return "Slot " + slot.ToString() + L(" - empty", " - leer");
            string scene = ReadValue(path, "scene", "office");
            string decisions = ReadValue(path, "decisionCount", "");
            string score = ReadValue(path, "score", "0");
            int count = CountLines(path, "decision=");
            if (decisions.Length == 0) decisions = count.ToString();
            return "Slot " + slot.ToString() + " - " + Decode(scene) + " / " + decisions + L(" decisions / Score ", " Entscheidungen / Score ") + score;
        }

        private void RefreshSlotInfo()
        {
            if (_slotInfo == null) return;
            string path = SlotFile(_activeSlot);
            if (!File.Exists(path))
            {
                _slotInfo.Text = L("Active slot ", "Aktiver Slot ") + _activeSlot.ToString() + L(": empty", ": leer");
                return;
            }
            string savedAt = Decode(ReadValue(path, "savedAt", L("unknown", "unbekannt")));
            string score = ReadValue(path, "score", "0");
            int count = CountLines(path, "decision=");
            _slotInfo.Text = L("Active slot ", "Aktiver Slot ") + _activeSlot.ToString() + " | " + L("saved: ", "gespeichert: ") + savedAt + " | " + L("Decisions: ", "Entscheidungen: ") + count.ToString() + " | Score: " + score;
        }

        private string ReadValue(string path, string key, string fallback)
        {
            try
            {
                string prefix = key + "=";
                string[] lines = File.ReadAllLines(path, Encoding.UTF8);
                for (int i = 0; i < lines.Length; i++)
                {
                    if (lines[i].StartsWith(prefix)) return lines[i].Substring(prefix.Length);
                }
            }
            catch
            {
            }
            return fallback;
        }

        private int CountLines(string path, string prefix)
        {
            try
            {
                int count = 0;
                string[] lines = File.ReadAllLines(path, Encoding.UTF8);
                for (int i = 0; i < lines.Length; i++)
                {
                    if (lines[i].StartsWith(prefix)) count++;
                }
                return count;
            }
            catch
            {
                return 0;
            }
        }

        private string BuildWarning(Scene scene)
        {
            if (scene.WarningAt > 0 && _shift >= scene.WarningAt) return L("REMEMBER", "ERINNERE DICH");
            if (_stress >= 6) return L("STAY FOCUSED", "BLEIB FOKUSSIERT");
            if (_integrity <= 2) return L("IDENTITY CRITICAL", "IDENTITAET KRITISCH");
            if (_trust <= -3) return L("JONAS IS PULLING BACK", "JONAS ZIEHT SICH ZURUECK");
            return string.Empty;
        }

        private string BuildSignalText(Scene scene)
        {
            int depth = Math.Min(100, (_decisions.Count * 2) + (_insight * 4) + (_access * 3) + (_score / 250));
            return LocalizeContent("Signal: " + StabilityLabel() + " | " + L("Target: ", "Ziel: ") + scene.Objective + " | " + L("Case depth: ", "Falltiefe: ") + depth.ToString() + "%");
        }

        private string BuildThreadSummary()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine(L("Mira remains the center of the case, but your role is no longer stable.", "Mira bleibt das Zentrum des Falls, aber deine Rolle ist nicht mehr stabil."));
            if (GetFlag("openedFile")) sb.AppendLine(L("The file shows personal revisions.", "Die Akte zeigt persoenliche Ueberarbeitungen."));
            if (GetFlag("followedMemory")) sb.AppendLine(L("You trusted a memory more than the report.", "Du hast einer Erinnerung mehr vertraut als dem Bericht."));
            if (GetFlag("heardTape")) sb.AppendLine(L("Tape 08 confirms a technical reset.", "Band 08 bestaetigt eine technische Ruecksetzung."));
            if (GetFlag("foundProtocol")) sb.AppendLine(L("The protocol schema opens late core routes.", "Das Protokollschema oeffnet spaete Kernrouten."));
            if (GetFlag("counterTape")) sb.AppendLine(L("The counter-tape can disrupt Mira's anchor role.", "Das Gegenband kann Miras Ankerrolle stoeren."));
            if (GetFlag("rootAccess")) sb.AppendLine(L("You have operator rights on the console.", "Du hast Betreiberrechte an der Konsole."));
            sb.Append(L("Current: ", "Aktuell: "));
            sb.Append(StabilityLabel());
            sb.Append(L(", Stress ", ", Belastung "));
            sb.Append(_stress.ToString());
            sb.Append(L("/7, Integrity ", "/7, Integritaet "));
            sb.Append(_integrity.ToString());
            sb.Append("/10");
            return LocalizeContent(sb.ToString().Trim());
        }

        private void SelectGameMode()
        {
            DialogResult result = MessageBox.Show(
                L(
                    "Choose difficulty:\n\nYes = Hard (360 min)\nNo = Speedrun (360 min)\nCancel = Normal (720 min)",
                    "Schwierigkeitsgrad:\n\nJa = Hard (360 min)\nNein = Speedrun (360 min)\nAbbrechen = Normal (720 min)"
                ),
                L("Game mode", "Spielmodus"),
                MessageBoxButtons.YesNoCancel,
                MessageBoxIcon.Question
            );

            if (result == DialogResult.Yes)
            {
                _gameMode = GameMode.Hard;
                _shiftTotalMinutes = 360;
            }
            else if (result == DialogResult.No)
            {
                _gameMode = GameMode.Speedrun;
                _shiftTotalMinutes = 360;
            }
            else
            {
                _gameMode = GameMode.Normal;
                _shiftTotalMinutes = 720;
            }
        }

        private void AdvanceClock(int minutes)
        {
            _shiftElapsedMinutes = Math.Max(0, _shiftElapsedMinutes + Math.Max(0, minutes));
            UpdateTimeDisplay();

            if (_shiftElapsedMinutes >= _shiftTotalMinutes)
            {
                _clockTimer.Stop();
                MessageBox.Show(
                    L("Shift time is over. Restarting from office.", "Schichtzeit ist abgelaufen. Neustart im Buero."),
                    L("Time up", "Zeit abgelaufen"),
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Warning
                );
                ResetState();
                SaveSlot(_activeSlot);
                Render();
                _clockTimer.Start();
            }
        }

        private void UpdateTimeDisplay()
        {
            if (_timeDisplay == null || _modeDisplay == null) return;

            int startMinutes = (2 * 60) + 13;
            int currentMinutes = startMinutes + _shiftElapsedMinutes;
            int hours = (currentMinutes / 60) % 24;
            int mins = currentMinutes % 60;
            int remaining = Math.Max(0, _shiftTotalMinutes - _shiftElapsedMinutes);

            _timeDisplay.Text = hours.ToString("D2") + ":" + mins.ToString("D2") + " / " + remaining.ToString("D3") + "MIN";
            _modeDisplay.Text = "MODE: " + _gameMode.ToString().ToUpperInvariant();

            if (remaining < 60) _timeDisplay.ForeColor = Color.FromArgb(255, 105, 105);
            else if (remaining < 180) _timeDisplay.ForeColor = Color.FromArgb(255, 205, 120);
            else _timeDisplay.ForeColor = Color.FromArgb(150, 200, 255);

            if (_messageDisplay != null)
            {
                int unread = 0;
                for (int i = 0; i < _messages.Count; i++)
                {
                    if (!_messages[i].IsRead) unread++;
                }
                _messageDisplay.Text = "MAIL: " + unread.ToString() + " NEW";
            }
        }

        private void EnsureStartupMessages()
        {
            if (_messages.Count > 0) return;
            AddMessage("Dispatch", L("Unit Voss, acknowledge.", "Einheit Voss, bitte melden."));
            AddMessage("Jonas", L("I found a strange archive trace. Don't go alone.", "Ich habe eine seltsame Archivspur gefunden. Geh nicht allein."));
            UpdateTimeDisplay();
        }

        private void AddMessage(string sender, string content)
        {
            _messages.Add(new IncomingMessage
            {
                Sender = sender,
                Content = content,
                IsRead = false
            });
        }

        private void ShowMessagesOverlay()
        {
            if (_messages.Count == 0)
            {
                MessageBox.Show(L("No messages.", "Keine Nachrichten."), L("Messages", "Nachrichten"));
                return;
            }

            StringBuilder sb = new StringBuilder();
            for (int i = _messages.Count - 1; i >= 0; i--)
            {
                IncomingMessage msg = _messages[i];
                sb.AppendLine("[" + msg.Sender + "] " + msg.Content);
                sb.AppendLine();
                msg.IsRead = true;
            }

            MessageBox.Show(sb.ToString().Trim(), L("Messages", "Nachrichten"), MessageBoxButtons.OK, MessageBoxIcon.Information);
            UpdateTimeDisplay();
        }

        private void CheckClueCombos()
        {
            bool hasFoto12 = HasNoteTitle("photo", "Foto #12");
            bool hasFaserprofil = HasNoteTitle("clue", "Faserprofil");
            bool hasBand08 = HasNoteTitle("clue", "Band 08");
            bool hasReset = HasNoteTitle("clue", "Ruecksetzlogs");
            bool hasGegenband = HasNoteTitle("clue", "Gegenband");
            bool hasKonsole = HasNoteTitle("clue", "Kontrollkonsole");

            TryUnlockCombo("photo_fiber", hasFoto12 && hasFaserprofil,
                L("Photo + fiber reveal a harbor convergence.", "Foto + Faserprofil ergeben eine Hafen-Konvergenz."),
                2,
                30,
                1,
                0);

            TryUnlockCombo("band_reset", hasBand08 && hasReset,
                L("Tape 08 aligns with reset logs.", "Band 08 stimmt mit den Ruecksetzlogs ueberein."),
                2,
                35,
                1,
                0);

            TryUnlockCombo("counter_console", hasGegenband && hasKonsole,
                L("Counter-tape can now alter the console outcome.", "Gegenband kann jetzt den Konsolen-Ausgang veraendern."),
                1,
                40,
                0,
                1);
        }

        private bool HasNoteTitle(string type, string title)
        {
            for (int i = 0; i < _notes.Count; i++)
            {
                NoteItem note = _notes[i];
                if (note.Type == type && note.Title == title) return true;
            }
            return false;
        }

        private void TryUnlockCombo(string key, bool condition, string message, int insightGain, int scoreGain, int shiftGain, int trustGain)
        {
            bool done;
            if (_triggeredCombos.TryGetValue(key, out done) && done) return;
            if (!condition) return;

            _triggeredCombos[key] = true;
            _comboCount++;
            _insight = Clamp(_insight + insightGain, 0, 10);
            _shift = Clamp(_shift + shiftGain, 0, 7);
            _trust = Clamp(_trust + trustGain, -3, 3);
            _score = Math.Max(0, _score + scoreGain);

            _notes.Add(new NoteItem
            {
                Type = "anomaly",
                SceneId = _sceneId,
                Title = L("Combo unlocked", "Kombi freigeschaltet"),
                Text = message
            });

            AddMessage("System", L("CLUE COMBO UNLOCKED:", "HINWEIS-KOMBO FREIGESCHALTET:") + " " + message);
            UpdateTimeDisplay();
        }

        private string BuildChoicePreview(Choice choice)
        {
            if (choice == null || choice.Effects == null || choice.Effects.Length == 0)
            {
                return L("No immediate stat changes.", "Keine direkten Statusaenderungen.");
            }

            int deltaShift = 0;
            int deltaStress = 0;
            int deltaTrust = 0;
            int deltaInsight = 0;
            int deltaAccess = 0;
            int deltaIntegrity = 0;
            int deltaTime = 0;

            for (int i = 0; i < choice.Effects.Length; i++)
            {
                Effect fx = choice.Effects[i];
                if (fx.Type == "shift") deltaShift += fx.IntValue;
                else if (fx.Type == "stress") deltaStress += fx.IntValue;
                else if (fx.Type == "trust") deltaTrust += fx.IntValue;
                else if (fx.Type == "insight") deltaInsight += fx.IntValue;
                else if (fx.Type == "access") deltaAccess += fx.IntValue;
                else if (fx.Type == "integrity") deltaIntegrity += fx.IntValue;
                else if (fx.Type == "time") deltaTime += fx.IntValue;
            }

            StringBuilder sb = new StringBuilder();
            sb.AppendLine(L("Consequence preview", "Konsequenz-Vorschau"));
            if (deltaShift != 0) sb.AppendLine("Shift " + Signed(deltaShift));
            if (deltaStress != 0) sb.AppendLine(L("Stress ", "Belastung ") + Signed(deltaStress));
            if (deltaTrust != 0) sb.AppendLine(L("Trust ", "Vertrauen ") + Signed(deltaTrust));
            if (deltaInsight != 0) sb.AppendLine(L("Insight ", "Einsicht ") + Signed(deltaInsight));
            if (deltaAccess != 0) sb.AppendLine(L("Access ", "Zugang ") + Signed(deltaAccess));
            if (deltaIntegrity != 0) sb.AppendLine(L("Integrity ", "Integritaet ") + Signed(deltaIntegrity));
            if (deltaTime != 0) sb.AppendLine(L("Shift-time +", "Schichtzeit +") + deltaTime.ToString() + "h");
            return sb.ToString().TrimEnd();
        }

        private string Signed(int value)
        {
            return value >= 0 ? "+" + value.ToString() : value.ToString();
        }

        private string BuildLeadText()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine(L("Open leads", "Offene Faehrten"));
            sb.AppendLine();
            AddLead(sb, L("Archive core", "Archivkern"), _access >= 2 || GetFlag("foundProtocol"), L("Gain more access via the lab, radio room or Jonas' office.", "Mehr Zugang ueber Labor, Funk oder Jonas' Buero."));
            AddLead(sb, L("Mira's flat", "Miras Wohnung"), GetFlag("foundRedKey") || HasVisited("miraFlat"), L("The photo back or a witness leads to the flat.", "Foto-Rueckseite oder Zeugin fuehren zur Wohnung."));
            AddLead(sb, L("Server core", "Serverkern"), GetFlag("hasResetLogs"), L("The service lift, tunnel map or root console lead to the core.", "Dienstaufzug, Tunnelkarte oder Root-Konsole fuehren zum Kern."));
            AddLead(sb, L("Counter-tape", "Gegenband"), GetFlag("counterTape"), L("The tape archive with high insight unlocks the counter-proof.", "Tonbandarchiv mit hoher Einsicht erschliesst den Gegenbeweis."));
            AddLead(sb, L("Mira's exit", "Miras Ausgang"), GetFlag("miraCanLeave"), L("Feed the counter-tape into the protocol before confronting Mira.", "Gegenband ins Protokoll einspeisen, bevor du Mira konfrontierst."));
            sb.AppendLine();
            sb.AppendLine(L("Project scale", "Spielumfang"));
            sb.AppendLine(L("Scenes in case: ", "Szenen im Fall: ") + _scenes.Count.ToString());
            sb.AppendLine(L("Decisions so far: ", "Bisherige Entscheidungen: ") + _decisions.Count.ToString());
            sb.AppendLine(L("Current slot shift time: +", "Schichtzeit im aktuellen Slot: +") + _hours.ToString() + "h");
            sb.AppendLine(L("Clue combos unlocked: ", "Hinweis-Kombos freigeschaltet: ") + _comboCount.ToString());
            sb.AppendLine(L("Rank: ", "Rangwertung: ") + RankLabel() + " / Score " + _score.ToString());
            return LocalizeContent(sb.ToString().TrimEnd());
        }

        private string BuildAchievementText()
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine(L("Echo Protocol major build", "Echo Protocol Grossprojekt"));
            sb.AppendLine();
            sb.AppendLine(L("Content scale", "Content-Scale"));
            sb.AppendLine(L("  Handcrafted core route plus Deep Archive", "  Handgeschriebene Kernroute plus Deep Archive"));
            sb.AppendLine(L("  Active scenes in runtime index: ", "  Aktive Szenen im Runtime-Index: ") + _scenes.Count.ToString());
            sb.AppendLine(L("  Deep Archive case files: ", "  Deep-Archive-Akten: ") + (ArchiveDistrictCount * ArchiveCaseCount).ToString());
            sb.AppendLine(L("  Deep Archive layers: ", "  Deep-Archive-Schichten: ") + (ArchiveDistrictCount * ArchiveCaseCount * ArchiveLayerCount).ToString());
            sb.AppendLine();
            sb.AppendLine(L("Achievements", "Erfolge"));
            AchievementLine(sb, L("Night shift started", "Nachtschicht begonnen"), _decisions.Count > 0);
            AchievementLine(sb, L("Entered Deep Archive", "Deep Archive betreten"), GetFlag("enteredDeepArchive") || HasVisited("archiveHub"));
            AchievementLine(sb, L("100 decisions", "100 Entscheidungen"), _decisions.Count >= 100);
            AchievementLine(sb, L("250 decisions", "250 Entscheidungen"), _decisions.Count >= 250);
            AchievementLine(sb, L("500 decisions", "500 Entscheidungen"), _decisions.Count >= 500);
            AchievementLine(sb, L("Insight maxed", "Einsicht maximiert"), _insight >= 10);
            AchievementLine(sb, L("Access maxed", "Zugang maximiert"), _access >= 10);
            AchievementLine(sb, L("Root access", "Root-Zugriff"), GetFlag("rootAccess"));
            AchievementLine(sb, L("Counter-tape created", "Gegenband erstellt"), GetFlag("counterTape"));
            AchievementLine(sb, L("Deep Archive proof block", "Deep-Archive-Beweisblock"), GetFlag("deepArchiveProof"));
            AchievementLine(sb, L("Mira can leave", "Mira kann gehen"), GetFlag("miraCanLeave"));
            AchievementLine(sb, "Score 1.000", _score >= 1000);
            AchievementLine(sb, "Score 5.000", _score >= 5000);
            AchievementLine(sb, "Score 10.000", _score >= 10000);
            sb.AppendLine();
            sb.AppendLine(L("Current rank: ", "Aktueller Rang: ") + RankLabel());
            sb.AppendLine("Score: " + _score.ToString());
            return LocalizeContent(sb.ToString().TrimEnd());
        }

        private void AchievementLine(StringBuilder sb, string title, bool done)
        {
            sb.Append(done ? "[x] " : "[ ] ");
            sb.AppendLine(title);
        }

        private string RankLabel()
        {
            if (_score >= 15000) return L("S-Rank / Investigations Directorate", "S-Rang / Ermittlungsdirektion");
            if (_score >= 9000) return L("A-Rank / Core Investigator", "A-Rang / Kernermittler");
            if (_score >= 4500) return L("B-Rank / Archive Breaker", "B-Rang / Archivbrecher");
            if (_score >= 1800) return L("C-Rank / Case Analyst", "C-Rang / Fallanalyst");
            if (_score >= 600) return L("D-Rank / Trace Seeker", "D-Rang / Spurensucher");
            return L("E-Rank / Night Shift", "E-Rang / Nachtschicht");
        }

        private void AddLead(StringBuilder sb, string title, bool done, string hint)
        {
            sb.Append(done ? L("[active] ", "[aktiv] ") : L("[open] ", "[offen] "));
            sb.AppendLine(title);
            if (!done) sb.AppendLine("  " + hint);
            sb.AppendLine();
        }

        private bool HasVisited(string sceneId)
        {
            for (int i = 0; i < _decisions.Count; i++)
            {
                if (_decisions[i].StartsWith(sceneId + ":")) return true;
            }
            return _sceneId == sceneId;
        }

        private string BuildNoteText(string type, int limit)
        {
            StringBuilder sb = new StringBuilder();
            int shown = 0;
            for (int i = _notes.Count - 1; i >= 0; i--)
            {
                NoteItem item = _notes[i];
                if (item.Type != type) continue;
                shown++;
                sb.AppendLine("[" + item.SceneId + "] " + item.Title);
                sb.AppendLine(type == "diary" ? MutateDiary(item.Text) : item.Text);
                sb.AppendLine();
                if (shown >= limit) break;
            }
            if (shown == 0) return LocalizeContent(L("Nothing here yet.", "Noch leer."));
            return LocalizeContent(sb.ToString().TrimEnd());
        }

        private string BuildTimelineText()
        {
            StringBuilder sb = new StringBuilder();
            if (_decisions.Count == 0)
            {
                sb.AppendLine(L("No run recorded yet.", "Noch kein Durchlauf protokolliert."));
            }
            else
            {
                for (int i = 0; i < _decisions.Count; i++)
                {
                    sb.AppendLine((i + 1).ToString("00") + "  " + _decisions[i]);
                }
            }

            sb.AppendLine();
            sb.AppendLine("Shift: " + _shift.ToString() + " / 7");
            sb.AppendLine(L("Stress: ", "Belastung: ") + _stress.ToString() + " / 7");
            sb.AppendLine(L("Trust: ", "Vertrauen: ") + TrustLabel());
            sb.AppendLine(L("Insight: ", "Einsicht: ") + _insight.ToString() + " / 10");
            sb.AppendLine(L("Access: ", "Zugang: ") + _access.ToString() + " / 10");
            sb.AppendLine(L("Integrity: ", "Integritaet: ") + _integrity.ToString() + " / 10");
            sb.AppendLine(L("Run: ", "Durchlauf: ") + _loop.ToString());
            sb.AppendLine(L("Shift time: +", "Schichtzeit: +") + _hours.ToString() + "h");
            sb.AppendLine("Score: " + _score.ToString());
            sb.AppendLine(L("Rank: ", "Rang: ") + RankLabel());
            return LocalizeContent(sb.ToString().TrimEnd());
        }

        private string MutateDiary(string text)
        {
            if (_shift < 4) return text;
            return text.Replace("Ich", "Ich (oder jemand in mir)").Replace("Mira", "Mira / Subjekt M");
        }

        private void HandleGlobalKeys(object sender, KeyEventArgs e)
        {
            if (e.Control && e.KeyCode == Keys.S)
            {
                SaveCurrentSlot();
                e.Handled = true;
                return;
            }
            if (e.Control && e.KeyCode == Keys.L)
            {
                LoadSelectedSlot();
                e.Handled = true;
                return;
            }

            int index = -1;
            if (e.KeyCode >= Keys.D1 && e.KeyCode <= Keys.D9) index = e.KeyCode - Keys.D1;
            else if (e.KeyCode >= Keys.NumPad1 && e.KeyCode <= Keys.NumPad9) index = e.KeyCode - Keys.NumPad1;

            if (index >= 0 && index < _choiceButtons.Count && _choiceButtons[index].Enabled)
            {
                _choiceButtons[index].PerformClick();
                e.Handled = true;
            }
        }

        private void AddScene(string id, string stage, string title, string location, string objective, string normal, string shifted, string quoteNormal, string quoteShifted, int warningAt, params Choice[] choices)
        {
            _scenes[id] = new Scene
            {
                Id = id,
                Stage = stage,
                Title = title,
                Location = location,
                Objective = objective,
                TextNormal = normal,
                TextShifted = shifted,
                QuoteNormal = quoteNormal,
                QuoteShifted = quoteShifted,
                WarningAt = warningAt,
                Choices = choices
            };
        }

        private Choice C(string id, string label, string hint, string next, params Effect[] effects)
        {
            return new Choice { Id = id, Label = label, Hint = hint, Next = next, Effects = effects };
        }

        private Choice RequireFlag(Choice choice, string flag, string lockHint)
        {
            choice.RequiredFlag = flag;
            choice.LockHint = lockHint;
            return choice;
        }

        private Choice RequireAccess(Choice choice, int min, string lockHint)
        {
            choice.MinAccess = min;
            choice.LockHint = lockHint;
            return choice;
        }

        private Choice RequireInsight(Choice choice, int min, string lockHint)
        {
            choice.MinInsight = min;
            choice.LockHint = lockHint;
            return choice;
        }

        private Choice RequireIntegrity(Choice choice, int min, string lockHint)
        {
            choice.MinIntegrity = min;
            choice.LockHint = lockHint;
            return choice;
        }

        private static string ResolveLauncherLanguage()
        {
            string raw = Environment.GetEnvironmentVariable("LUMORIX_LANGUAGE")
                ?? Environment.GetEnvironmentVariable("LUMORIX_LOCALE")
                ?? "en";

            raw = raw.Trim().ToLowerInvariant();
            if (raw.StartsWith("de")) return "de";
            if (raw.StartsWith("pl")) return "pl";
            return "en";
        }

        private string L(string english, string german)
        {
            return _language == "de" ? german : english;
        }

        private string LocalizeContent(string text)
        {
            if (_language == "de" || string.IsNullOrEmpty(text)) return text;

            string translated = text;
            for (int i = 0; i < ContentReplacements.GetLength(0); i++)
            {
                translated = translated.Replace(ContentReplacements[i, 0], ContentReplacements[i, 1]);
            }
            return translated;
        }

        private bool GetFlag(string key)
        {
            bool value;
            if (_flags.TryGetValue(key, out value)) return value;
            return false;
        }

        private string StabilityLabel()
        {
            if (_shift <= 1) return L("stable, but porous", "stabil, aber poroes");
            if (_shift <= 3) return L("fragile", "bruechig");
            if (_shift <= 5) return L("critical", "kritisch");
            return L("near collapse", "nahe am Kollaps");
        }

        private string TrustLabel()
        {
            if (_trust <= -2) return L("hostile", "feindlich");
            if (_trust == -1) return L("strained", "angespannt");
            if (_trust == 0) return L("unclear", "unklar");
            if (_trust <= 2) return L("usable", "brauchbar");
            return L("high", "hoch");
        }

        private int Clamp(int value, int min, int max)
        {
            if (value < min) return min;
            if (value > max) return max;
            return value;
        }

        private int ParseInt(string raw, int fallback)
        {
            int value;
            if (int.TryParse(raw, out value)) return value;
            return fallback;
        }

        private string Encode(string value)
        {
            return Uri.EscapeDataString(value ?? string.Empty);
        }

        private string Decode(string value)
        {
            return Uri.UnescapeDataString(value ?? string.Empty);
        }

        private static Effect Flag(string key, bool value)
        {
            return new Effect { Type = "flag", Key = key, BoolValue = value };
        }

        private static Effect Shift(int value)
        {
            return new Effect { Type = "shift", IntValue = value };
        }

        private static Effect Stress(int value)
        {
            return new Effect { Type = "stress", IntValue = value };
        }

        private static Effect Trust(int value)
        {
            return new Effect { Type = "trust", IntValue = value };
        }

        private static Effect LoopDelta(int value)
        {
            return new Effect { Type = "loop", IntValue = value };
        }

        private static Effect Insight(int value)
        {
            return new Effect { Type = "insight", IntValue = value };
        }

        private static Effect Access(int value)
        {
            return new Effect { Type = "access", IntValue = value };
        }

        private static Effect Integrity(int value)
        {
            return new Effect { Type = "integrity", IntValue = value };
        }

        private static Effect Time(int value)
        {
            return new Effect { Type = "time", IntValue = value };
        }

        private static Effect Score(int value)
        {
            return new Effect { Type = "score", IntValue = value };
        }

        private static Effect Note(string type, string title, string text)
        {
            return new Effect { Type = "note", NoteType = type, NoteTitle = title, NoteText = text };
        }
    }
}
