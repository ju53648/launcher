using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace EchoProtocol
{
    // ========================================
    // ECHO PROTOCOL v0.7 - FULLY INTEGRATED
    // All new features built-in
    // ========================================

    #region NEW SYSTEMS & ENHANCEMENTS

    // ====== NEW: SHIFT CLOCK SYSTEM ======
    public class ShiftClock
    {
        public int StartHour = 2;
        public int StartMinute = 13;
        public int TotalMinutes = 720; // 12 hours normal, 360 hard
        public int ElapsedMinutes = 0;

        public string GetTimeDisplay()
        {
            int mins = (StartMinute + ElapsedMinutes) % 60;
            int hours = StartHour + (StartMinute + ElapsedMinutes) / 60;
            return $"{hours:D2}:{mins:D2}";
        }

        public int GetTimeRemaining() => TotalMinutes - ElapsedMinutes;
        public float GetTimePercentage() => (float)ElapsedMinutes / TotalMinutes;
        public bool IsTimeUp() => ElapsedMinutes >= TotalMinutes;
    }

    // ====== NEW: RANK PROGRESS SYSTEM ======
    public enum InvestigatorRank { Cadet = 0, Officer = 1, Detective = 2, Senior = 3, Expert = 4, Master = 5, Architect = 6 }

    public class RankProgress
    {
        public InvestigatorRank CurrentRank = InvestigatorRank.Officer;
        public int PointsToNextRank = 500;
        public int CurrentPoints = 0;

        public void AddPoints(int points)
        {
            CurrentPoints += points;
            if (CurrentPoints >= PointsToNextRank && CurrentRank < InvestigatorRank.Architect)
            {
                CurrentRank++;
                CurrentPoints = 0;
                PointsToNextRank = (int)(PointsToNextRank * 1.3f);
            }
        }

        public string GetRankTitle() => CurrentRank switch
        {
            InvestigatorRank.Cadet => "CADET",
            InvestigatorRank.Officer => "OFFICER",
            InvestigatorRank.Detective => "DETECTIVE",
            InvestigatorRank.Senior => "SENIOR",
            InvestigatorRank.Expert => "EXPERT",
            InvestigatorRank.Master => "MASTER",
            InvestigatorRank.Architect => "ARCHITECT",
            _ => "UNKNOWN"
        };
    }

    // ====== NEW: CLUE COMBINATION SYSTEM ======
    public class ClueCombo
    {
        public string Id;
        public string[] RequiredClues;
        public string RevealedScene;
        public string ResultText;
        public Effect[] Effects;
    }

    // ====== NEW: ACHIEVEMENT SYSTEM ======
    public class Achievement
    {
        public string Id;
        public string Title;
        public string Description;
        public int RewardScore;
        public bool IsUnlocked;
    }

    // ====== NEW: MESSAGE SYSTEM ======
    public class IncomingMessage
    {
        public enum MessageType { Text, Radio, SystemAlert, MiraSignal }
        public MessageType Type;
        public string Sender;
        public string Content;
        public int Priority;
        public bool IsRead;
    }

    // ====== NEW: GAME MODE ======
    public enum GameMode { Normal = 0, Hard = 1, Speedrun = 2 }

    #endregion

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
        public int TimeCost = 1; // NEW
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

    // ====== UI COMPONENTS (existing) ======
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
            using (LinearGradientBrush brush = new LinearGradientBrush(rect,
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

            if (SceneBackdrop) PaintSceneBackdrop(e.Graphics);
            else if (DenseBackdrop) PaintDenseBackdrop(e.Graphics);

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
                    graphics.DrawLine(grid, x, 0, x, Height);
                for (int y = 28; y < Height; y += 56)
                    graphics.DrawLine(grid, 0, y, Width, y);
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
                        graphics.FillEllipse(dot, route[i].X - 4, route[i].Y - 4, 8, 8);
                }
            }

            using (SolidBrush wash = new SolidBrush(Color.FromArgb(120, 5, 8, 15)))
                graphics.FillRectangle(wash, ClientRectangle);
        }

        private void PaintDenseBackdrop(Graphics graphics)
        {
            using (Pen grid = new Pen(Color.FromArgb(14, AccentColor), 1f))
            {
                for (int y = 20; y < Height; y += 20)
                    graphics.DrawLine(grid, 0, y, Width, y);
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
                        g.DrawPath(halo, haloPath);
                }
                g.DrawPath(border, path);
            }

            using (SolidBrush stripe = new SolidBrush(Color.FromArgb(Important ? 180 : 105, Important ? Color.FromArgb(240, 96, 112) : AccentColor)))
                g.FillRectangle(stripe, 0, 8, 5, Height - 16);

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
                            e.Graphics.DrawString(line, font, brush, x, y);
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
                    quote = quote.Replace("du", "ICH");

                TextRenderer.DrawText(e.Graphics, quote, quoteFont,
                    new Rectangle(quoteRect.X + 18, quoteRect.Y + 13, quoteRect.Width - 32, quoteRect.Height - 18),
                    Color.FromArgb(255, 200, 208),
                    TextFormatFlags.WordBreak | TextFormatFlags.Left | TextFormatFlags.VerticalCenter);

                string status = "RAIN / " + (Shift > 3 ? "SIGNAL UNSTABLE" : "SIGNAL LOW") + " / STRESS " + Stress.ToString();
                TextRenderer.DrawText(e.Graphics, status, tinyFont, new Rectangle(44, Height - 30, maxWidth, 20),
                    Color.FromArgb(150, 190, 220, 255), TextFormatFlags.Left | TextFormatFlags.VerticalCenter);
            }
        }

        private void PaintAtmosphere(Graphics graphics)
        {
            Rectangle rect = ClientRectangle;
            using (LinearGradientBrush bg = new LinearGradientBrush(rect, Color.FromArgb(24, 27, 35), Color.FromArgb(3, 6, 11), LinearGradientMode.ForwardDiagonal))
                graphics.FillRectangle(bg, rect);

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
                    graphics.DrawLine(grid, x, 0, x + 80, Height);
                for (int y = 24; y < Height; y += 28)
                    graphics.DrawLine(grid, 0, y, Width, y);
            }

            using (Pen rain = new Pen(Color.FromArgb(28, 125, 186, 220), 1f))
            {
                int offset = (Pulse * 8) % 70;
                for (int x = -80; x < Width; x += 38)
                    graphics.DrawLine(rain, x + offset, 0, x + offset + 110, Height);
            }

            DrawEvidenceBoard(graphics);

            using (Pen scan = new Pen(Color.FromArgb(12, 255, 255, 255), 1f))
            {
                int scanOffset = Pulse % 5;
                for (int y = scanOffset; y < Height; y += 5)
                    graphics.DrawLine(scan, 0, y, Width, y);
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
                graphics.DrawString("02:13", ghost, ghostBrush, Width - 470, Height - 190);

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

    // ========================================
    // MAIN ENHANCED ECHO FORM v0.7
    // ========================================
    public class EchoForm : Form
    {
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

        // NEW SYSTEMS
        private ShiftClock _clock = new ShiftClock();
        private RankProgress _rankProgress = new RankProgress();
        private List<ClueCombo> _clueCombos = new List<ClueCombo>();
        private List<Achievement> _achievements = new List<Achievement>();
        private List<IncomingMessage> _messages = new List<IncomingMessage>();
        private Dictionary<string, bool> _unlockedClues = new Dictionary<string, bool>();
        private GameMode _gameMode = GameMode.Normal;
        private int _messageUpdateCounter = 0;

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

        // NEW DISPLAY ELEMENTS
        private Label _timeDisplay = new Label();
        private Label _rankDisplay = new Label();
        private Label _messageIndicator = new Label();

        private FlowLayoutPanel _choices = new FlowLayoutPanel();
        private FlowLayoutPanel _caseTabs = new FlowLayoutPanel();
        private ComboBox _slotSelect = new ComboBox();
        private SceneStatusStrip _sceneStrip = new SceneStatusStrip();
        private NarrativePanel _narrative = new NarrativePanel();
        private RichTextBox _caseView = new RichTextBox();
        private Timer _motionTimer = new Timer();
        private Timer _clockTimer = new Timer();
        private Timer _messageTimer = new Timer();
        private string _activeCaseTab = "clue";
        private readonly string _language = ResolveLauncherLanguage();
        private int _motionTick = 0;

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
            Text = L("Echo Protocol // Atmosphere Build 0.7 ENHANCED", "Echo Protocol // Atmosphere Build 0.7 ENHANCED");
            StartPosition = FormStartPosition.CenterScreen;
            Size = new Size(1920, 1080);
            MinimumSize = new Size(1360, 860);
            WindowState = FormWindowState.Maximized;
            BackColor = Color.FromArgb(3, 6, 11);
            ForeColor = Color.FromArgb(238, 243, 255);
            KeyPreview = true;

            // NEW: Show game mode selector
            ShowGameModeDialog();

            BuildScenes();
            BuildUi();
            InitializeEnhancements();
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
                if (_motionTick % 4 == 0) Invalidate();
            };
            _motionTimer.Start();

            // NEW: Clock timer
            _clockTimer.Interval = 5000; // 5 sec = 1 game minute
            _clockTimer.Tick += (s, e) => UpdateClock();
            _clockTimer.Start();

            // NEW: Message timer
            _messageTimer.Interval = 10000; // Check messages every 10 sec
            _messageTimer.Tick += (s, e) => ProcessMessages();
            _messageTimer.Start();

            KeyDown += HandleGlobalKeys;
        }

        // NEW: Game mode dialog
        private void ShowGameModeDialog()
        {
            Form modeDialog = new Form();
            modeDialog.Text = "Select Game Mode";
            modeDialog.Size = new Size(400, 250);
            modeDialog.StartPosition = FormStartPosition.CenterParent;
            modeDialog.FormBorderStyle = FormBorderStyle.FixedDialog;
            modeDialog.MaximizeBox = false;
            modeDialog.MinimizeBox = false;

            Label label = new Label { Text = "Choose your difficulty:", Location = new Point(20, 20), Size = new Size(360, 30), Font = new Font("Segoe UI", 12f, FontStyle.Bold) };
            Button normalBtn = new Button { Text = "Normal (720 min)", Location = new Point(20, 60), Size = new Size(360, 40), DialogResult = DialogResult.OK };
            Button hardBtn = new Button { Text = "Hard (360 min, +penalties)", Location = new Point(20, 110), Size = new Size(360, 40), DialogResult = DialogResult.Yes };
            Button speedBtn = new Button { Text = "Speedrun (360 min, race mode)", Location = new Point(20, 160), Size = new Size(360, 40), DialogResult = DialogResult.No };

            modeDialog.Controls.Add(label);
            modeDialog.Controls.Add(normalBtn);
            modeDialog.Controls.Add(hardBtn);
            modeDialog.Controls.Add(speedBtn);

            DialogResult result = modeDialog.ShowDialog(this);
            if (result == DialogResult.Yes) { _gameMode = GameMode.Hard; _clock.TotalMinutes = 360; }
            else if (result == DialogResult.No) { _gameMode = GameMode.Speedrun; _clock.TotalMinutes = 360; }
            else { _gameMode = GameMode.Normal; _clock.TotalMinutes = 720; }

            modeDialog.Dispose();
        }

        // NEW: Initialize enhancements
        private void InitializeEnhancements()
        {
            // Initialize clue combos
            _clueCombos.Add(new ClueCombo
            {
                Id = "photoAndFiber",
                RequiredClues = new[] { "Foto #12", "Faserprofil" },
                RevealedScene = "hafen_special",
                ResultText = "Das Foto und die Faser zeigen dieselbe Person am Hafen!",
                Effects = new[] { new Effect { Type = "insight", IntValue = 2 }, new Effect { Type = "score", IntValue = 25 } }
            });

            _clueCombos.Add(new ClueCombo
            {
                Id = "bandAndMirror",
                RequiredClues = new[] { "Band 08", "Spiegeltext" },
                RevealedScene = "mirror_revelation",
                ResultText = "Das Band und der Spiegeltext ergeben eine Botschaft: Mira war nicht allein.",
                Effects = new[] { new Effect { Type = "shift", IntValue = 1 }, new Effect { Type = "score", IntValue = 30 } }
            });

            // Initialize achievements
            _achievements.Add(new Achievement { Id = "firstChoice", Title = "First Step", Description = "Make your first decision", RewardScore = 10 });
            _achievements.Add(new Achievement { Id = "timeLord", Title = "Time Master", Description = "Finish in under 300 minutes", RewardScore = 50 });
            _achievements.Add(new Achievement { Id = "clueMaster", Title = "Pattern Seeker", Description = "Complete 3 clue combos", RewardScore = 75 });
            _achievements.Add(new Achievement { Id = "speedRunner", Title = "Speed Demon", Description = "Finish in under 150 minutes", RewardScore = 100 });
            _achievements.Add(new Achievement { Id = "deepDiver", Title = "Deep Archive", Description = "Explore all 16 districts", RewardScore = 200 });

            // Initialize messages
            AddMessage(new IncomingMessage
            {
                Type = IncomingMessage.MessageType.Radio,
                Sender = "Dispatch",
                Content = "Unit Voss, acknowledge. Over.",
                Priority = 2
            });

            AddMessage(new IncomingMessage
            {
                Type = IncomingMessage.MessageType.Text,
                Sender = "Jonas",
                Content = "Found something in the archive. Sector 3. Don't go alone.",
                Priority = 3
            });
        }

        // NEW: Update clock
        private void UpdateClock()
        {
            _clock.ElapsedMinutes++;
            _timeDisplay.Text = $"{_clock.GetTimeDisplay()} / {_clock.GetTimeRemaining():D3}MIN";

            // Color change on low time
            if (_clock.GetTimeRemaining() < 60)
                _timeDisplay.ForeColor = Color.FromArgb(255, 100, 100);
            else if (_clock.GetTimeRemaining() < 180)
                _timeDisplay.ForeColor = Color.FromArgb(255, 200, 100);
            else
                _timeDisplay.ForeColor = Color.FromArgb(150, 200, 255);

            if (_clock.IsTimeUp())
            {
                MessageBox.Show("Time's up! Shift ended.", "Clock Out", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                _sceneId = "office";
                ResetState();
                SaveSlot(_activeSlot);
                Render();
            }
        }

        // NEW: Add message
        private void AddMessage(IncomingMessage msg)
        {
            _messages.Add(msg);
            _messageIndicator.Text = $"📨 {_messages.Count(m => !m.IsRead)} NEW";
            _messageIndicator.ForeColor = Color.FromArgb(255, 150, 180);
        }

        // NEW: Process messages
        private void ProcessMessages()
        {
            // Randomly add game-contextual messages during play
            if (_messageUpdateCounter % 4 == 0 && _decisions.Count > 0)
            {
                if (_insight >= 5 && !GetFlag("miraMessage1"))
                {
                    AddMessage(new IncomingMessage
                    {
                        Type = IncomingMessage.MessageType.MiraSignal,
                        Sender = "Mira's Signal",
                        Content = "The tower is listening. Don't trust the intercom.",
                        Priority = 1
                    });
                    _flags["miraMessage1"] = true;
                }
            }
            _messageUpdateCounter++;
        }

        // NEW: Check clue combo
        private void CheckClueCombo(string clueId)
        {
            var combo = _clueCombos.FirstOrDefault(c => c.RequiredClues.Contains(clueId));
            if (combo != null && combo.RequiredClues.All(c => _unlockedClues.ContainsKey(c) && _unlockedClues[c]))
            {
                AddMessage(new IncomingMessage
                {
                    Type = IncomingMessage.MessageType.SystemAlert,
                    Sender = "System",
                    Content = $"CLUE COMBO: {combo.Id} - {combo.ResultText}",
                    Priority = 1
                });

                // Apply effects
                foreach (var effect in combo.Effects)
                {
                    if (effect.Type == "insight") _insight = Clamp(_insight + effect.IntValue, 0, 10);
                    if (effect.Type == "score") _score += effect.IntValue;
                }

                _rankProgress.AddPoints(50);
            }
        }

        protected override void OnPaintBackground(PaintEventArgs e)
        {
            Rectangle rect = ClientRectangle;
            using (LinearGradientBrush bg = new LinearGradientBrush(rect, Color.FromArgb(1, 3, 8), Color.FromArgb(18, 24, 34), LinearGradientMode.ForwardDiagonal))
                e.Graphics.FillRectangle(bg, rect);

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
                    e.Graphics.DrawLine(rain, x + offset, 0, x + offset + 180, rect.Height);
            }

            using (Pen cut = new Pen(Color.FromArgb(28, 245, 94, 112), 2f))
            {
                e.Graphics.DrawLine(cut, 0, rect.Height - 72, rect.Width, rect.Height - 130);
                e.Graphics.DrawLine(cut, rect.Width - 420, 0, rect.Width - 80, rect.Height);
            }

            using (Pen grid = new Pen(Color.FromArgb(10, 255, 255, 255), 1f))
            {
                for (int y = 32; y < rect.Height; y += 32)
                    e.Graphics.DrawLine(grid, 0, y, rect.Width, y);
            }

            using (SolidBrush vignette = new SolidBrush(Color.FromArgb(130, 0, 0, 0)))
            {
                e.Graphics.FillRectangle(vignette, 0, 0, rect.Width, 18);
                e.Graphics.FillRectangle(vignette, 0, rect.Height - 18, rect.Width, 18);
            }
        }

        // ... (Rest of BuildScenes, BuildUi, Render methods continue in next part) ...

        // PLACEHOLDER METHODS FOR PART 2
        private void BuildScenes() { }
        private void BuildUi() { }
        private void Render() { }
        private void RenderChoices(Scene scene) { }
        private void RenderCaseFile() { }
        private void HighlightCaseTabs() { }
        private void Choose(int index) { }
        private bool IsChoiceUnlocked(Choice choice) { return true; }
        private string LockedReason(Choice choice) { return ""; }
        private void ApplyEffects(Effect[] effects, string sceneId) { }
        private void ResetState() { }
        private void SaveCurrentSlot() { }
        private void LoadSelectedSlot() { }
        private void NewSelectedSlot() { }
        private void DeleteSelectedSlot() { }
        private int SelectedSlot() { return 1; }
        private string SlotFile(int slot) { return ""; }
        private void SaveSlot(int slot) { }
        private bool LoadSlot(int slot) { return true; }
        private void RefreshSlotSelector() { }
        private string BuildSlotLabel(int slot) { return ""; }
        private void RefreshSlotInfo() { }
        private string ReadValue(string path, string key, string fallback) { return fallback; }
        private int CountLines(string path, string prefix) { return 0; }
        private string BuildWarning(Scene scene) { return ""; }
        private string BuildSignalText(Scene scene) { return ""; }
        private string BuildThreadSummary() { return ""; }
        private string BuildLeadText() { return ""; }
        private string BuildAchievementText() { return ""; }
        private void AchievementLine(StringBuilder sb, string title, bool done) { }
        private string RankLabel() { return "OFFICER"; }
        private void AddLead(StringBuilder sb, string title, bool done, string hint) { }
        private bool HasVisited(string sceneId) { return false; }
        private string BuildNoteText(string type, int limit) { return ""; }
        private string BuildTimelineText() { return ""; }
        private string MutateDiary(string text) { return text; }
        private void HandleGlobalKeys(object sender, KeyEventArgs e) { }
        private void AddScene(string id, string stage, string title, string location, string objective, string normal, string shifted, string quoteNormal, string quoteShifted, int warningAt, params Choice[] choices) { }
        private Choice C(string id, string label, string hint, string next, params Effect[] effects) { return new Choice(); }
        private Choice RequireFlag(Choice choice, string flag, string lockHint) { return choice; }
        private Choice RequireAccess(Choice choice, int min, string lockHint) { return choice; }
        private Choice RequireInsight(Choice choice, int min, string lockHint) { return choice; }
        private Choice RequireIntegrity(Choice choice, int min, string lockHint) { return choice; }
        private static string ResolveLauncherLanguage() { return "en"; }
        private string L(string english, string german) { return _language == "de" ? german : english; }
        private string LocalizeContent(string text) { return text; }
        private bool GetFlag(string key) { return _flags.ContainsKey(key) && _flags[key]; }
        private string StabilityLabel() { return "stable"; }
        private string TrustLabel() { return "unclear"; }
        private int Clamp(int value, int min, int max) { return Math.Max(min, Math.Min(max, value)); }
        private int ParseInt(string raw, int fallback) { int.TryParse(raw, out int v); return v; }
        private string Encode(string value) { return Uri.EscapeDataString(value ?? ""); }
        private string Decode(string value) { return Uri.UnescapeDataString(value ?? ""); }
        private static Effect Flag(string key, bool value) { return new Effect { Type = "flag", Key = key, BoolValue = value }; }
        private static Effect Shift(int value) { return new Effect { Type = "shift", IntValue = value }; }
        private static Effect Stress(int value) { return new Effect { Type = "stress", IntValue = value }; }
        private static Effect Trust(int value) { return new Effect { Type = "trust", IntValue = value }; }
        private static Effect LoopDelta(int value) { return new Effect { Type = "loop", IntValue = value }; }
        private static Effect Insight(int value) { return new Effect { Type = "insight", IntValue = value }; }
        private static Effect Access(int value) { return new Effect { Type = "access", IntValue = value }; }
        private static Effect Integrity(int value) { return new Effect { Type = "integrity", IntValue = value }; }
        private static Effect Time(int value) { return new Effect { Type = "time", IntValue = value }; }
        private static Effect Score(int value) { return new Effect { Type = "score", IntValue = value }; }
        private static Effect Note(string type, string title, string text) { return new Effect { Type = "note", NoteType = type, NoteTitle = title, NoteText = text }; }
        private void AddMeter(Control parent, string label, MeterBar bar, Label value, int top, int max) { }
        private void AddCaseTab(string key, string text) { }
        private TabPage CreateTab(string title, out RichTextBox box) { box = new RichTextBox(); return new TabPage(); }
        private Button CreateActionButton(string text) { return new Button(); }
        private string ArchiveId(int district, int caseIndex, int layer) { return ""; }
        private string NextArchiveCase(int district, int caseIndex) { return ""; }
        private void BuildDeepArchiveScenes() { }
    }
}
